import React, { useEffect, useState, useCallback } from "react"; // Added useCallback
import api from "../api/api";
import "./styles/department.css";

// 🌍 Global Alert Component - Extracted to its own component for better reusability
const Alert = React.memo(({ message, type, onClose }) => {
  if (!message) return null;

  return (
    <div className={`alert alert-${type}`}>
      <span>{message}</span>
      <button onClick={onClose} aria-label="Close alert">
        &times;
      </button>
    </div>
  );
});

function DepartmentPage() {
  const [employees, setEmployees] = useState([]);
  // Retrieve these once, at the component's top level, as they are not expected to change during session
  const deptName = localStorage.getItem("department");
  const deptId = localStorage.getItem("department_id");
  const userToken = localStorage.getItem("token"); // Store token once

  const [questions, setQuestions] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [responses, setResponses] = useState({});
  const [comment, setComment] = useState("");
  const [departmentHeadId, setDepartmentHeadId] = useState("");
  const [currentCommentId, setCurrentCommentId] = useState(null);

  const [viewEmployee, setViewEmployee] = useState(null);
  const [summary, setSummary] = useState({ pending: 0, done: 0, total: 0 });

  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("success");

  // Use a ref or useCallback for headers if it's being passed down to many children,
  // but for direct API calls, recreating it is fine if the token is stable.
  const headers = { Authorization: `Token ${userToken}` };

  // Use useCallback to memoize showAlert for performance and to avoid re-rendering children unnecessarily
  const showAlert = useCallback((message, type) => {
    setAlertMessage(message);
    setAlertType(type);

    const timer = setTimeout(() => {
      setAlertMessage("");
    }, 5000);

    return () => clearTimeout(timer);
  }, []); // Empty dependency array means this function is created once

  // 🔹 Fetch employees + summary - Wrapped in useCallback
  const fetchEmployees = useCallback(async () => {
    if (!deptId || !userToken) {
      // Added userToken check for robustness
      showAlert("Department ID or User Token not found. Please log in.", "error");
      return;
    }

    try {
      const res = await api.get(`employees/?department=${deptId}`, { headers });
      setEmployees(res.data);

      const sum = await api.get(
        `employees/department_summary/?department=${deptId}`,
        { headers }
      );
      setSummary(sum.data);
    } catch (err) {
      console.error("Error loading employees or summary:", err.response?.data || err.message); // More detailed error logging
      showAlert("Error loading employees and summary.", "error");
    }
  }, [deptId, userToken, showAlert, headers]); // Added dependencies

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]); // Now fetchEmployees is a stable dependency

  // 🔹 Fill form popup - Wrapped in useCallback
  const openFillForm = useCallback(async (emp) => {
    setSelectedEmployee(emp);
    setComment(""); // Ensure comment is reset for new employee
    setDepartmentHeadId(""); // Ensure Dept Head ID is reset
    setCurrentCommentId(null); // Ensure comment ID is reset

    if (!userToken) {
      showAlert("User not authenticated. Please log in.", "error");
      return;
    }

    try {
      const res = await api.get(
        `questions/for_employee/?department=${deptId}&employee=${emp.id}`,
        { headers }
      );

      setQuestions(res.data.questions);

      const initialResponses = {};
      res.data.questions.forEach((q) => {
        initialResponses[q.id] = q.is_checked;
      });
      setResponses(initialResponses);

      const { comment_text, department_head_id, comment_id } =
        res.data.department_comment_data || {}; // Handle cases where data might be missing
      setComment(comment_text || "");
      setDepartmentHeadId(department_head_id || "");
      setCurrentCommentId(comment_id || null); // Ensure null if not present
    } catch (err) {
      console.error("Error loading questions for employee:", err.response?.data || err.message);
      showAlert("Error loading questions for employee.", "error");
    }
  }, [deptId, userToken, showAlert, headers]);

  // 🔹 View popup - Wrapped in useCallback
  const openViewForm = useCallback(async (emp) => {
    if (!userToken) {
      showAlert("User not authenticated. Please log in.", "error");
      return;
    }

    try {
      const res = await api.get(
        `questions/for_employee/?department=${deptId}&employee=${emp.id}`,
        { headers }
      );

      const { comment_text, department_head_id } =
        res.data.department_comment_data || {};

      setViewEmployee({
        ...emp,
        questions: res.data.questions,
        viewComment: comment_text || "No comments available.",
        viewDepartmentHeadId: department_head_id || "N/A",
      });
    } catch (err) {
      console.error("Error loading form data for view:", err.response?.data || err.message);
      showAlert("Error loading form data for view.", "error");
    }
  }, [deptId, userToken, showAlert, headers]);

  // 🔹 Checkbox toggle - Wrapped in useCallback
  const toggleCheckbox = useCallback((qId) => {
    setResponses((prevResponses) => ({
      ...prevResponses,
      [qId]: !prevResponses[qId],
    }));
  }, []);

  // 🔹 Submit responses + comments - Wrapped in useCallback
  const handleSubmitResponses = useCallback(async () => {
    if (!departmentHeadId.trim()) {
      showAlert("Details of Authorized Person (Employee ID & Name) are required!", "error");
      return;
    }
    if (!selectedEmployee || !deptId || !userToken) {
      showAlert("Missing employee, department ID, or user token.", "error");
      return;
    }

    try {
      // Use Promise.all to send all patch requests concurrently for efficiency
      const patchPromises = questions.map((q) =>
        api.patch(
          `responses/${q.response_id}/`,
          { is_checked: responses[q.id] || false },
          { headers }
        )
      );
      await Promise.all(patchPromises);

      // ✅ Save/Update department-specific comment and Department Head ID
      const commentData = {
        employee: selectedEmployee.id,
        department: Number(deptId),
        comment_text: comment,
        department_head_id: departmentHeadId.trim(),
      };

      if (currentCommentId) {
        await api.patch(
          `department-comments/${currentCommentId}/`,
          commentData,
          { headers }
        );
      } else {
        await api.post(`department-comments/`, commentData, { headers });
      }

      showAlert("Responses and comments saved successfully!", "success");

      // Refresh employees and summary after submission
      await fetchEmployees();

      // Refresh view popup if same employee is open
      if (viewEmployee && viewEmployee.id === selectedEmployee.id) {
        await openViewForm(selectedEmployee); // Re-fetch to update view with latest data
      }

      // Reset states
      setSelectedEmployee(null);
      setComment("");
      setDepartmentHeadId("");
      setCurrentCommentId(null);
      setResponses({}); // Clear responses as well
    } catch (err) {
      console.error(
        "Error submitting responses or comments:",
        err.response ? err.response.data : err
      );
      showAlert("Error saving responses or comments. Please try again.", "error");
    }
  }, [
    departmentHeadId,
    selectedEmployee,
    deptId,
    userToken,
    questions,
    responses,
    comment,
    currentCommentId,
    viewEmployee,
    fetchEmployees,
    openViewForm,
    showAlert,
    headers
  ]);

  // 🔹 Sign out
  const handleSignOut = useCallback(() => {
    localStorage.clear();
    // Use React Router's `navigate` if you have it, otherwise window.location is fine
    window.location.href = "/";
  }, []); // No dependencies

  return (
    <div className="department-container">
      <Alert
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertMessage("")}
      />

      <header className="department-header">
        <h2>{deptName || "Department"} Dashboard</h2> {/* Fallback for deptName */}
        <button className="signout-btn" onClick={handleSignOut}>
          Sign Out
        </button>
      </header>

      <section className="summary-section">
        <h3>Summary</h3>
        <div className="summary-cards">
          <div className="summary-card total" aria-live="polite">Total: {summary.total}</div>
          <div className="summary-card pending" aria-live="polite">Pending: {summary.pending}</div>
          <div className="summary-card done" aria-live="polite">Done: {summary.done}</div>
        </div>
      </section>

      <section className="employees-section">
        <h3>Employees</h3>
        <div className="employee-grid">
          {employees.length > 0 ? (
            employees.map((emp) => (
              <div key={emp.id} className="employee-card" role="article">
                <h4>{emp.employee_name}</h4>
                <p>
                  <strong>ID:</strong> {emp.employee_id}
                </p>
                <p>
                  <strong>Emp. Dept:</strong> {emp.employee_department || "N/A"}
                </p>
                <p>
                  <strong>Status:</strong> {emp.status}{" "}
                </p>
                <div className="card-actions">
                  <button onClick={() => openFillForm(emp)}>Fill Form</button>
                  <button className="view-btn" onClick={() => openViewForm(emp)}>
                    View
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>No employees found for this department.</p>
          )}
        </div>
      </section>

      {/* Fill Form Popup */}
      {selectedEmployee && (
        <div className="form-popup" role="dialog" aria-modal="true" aria-labelledby="fill-form-title">
          <div className="form-popup-content">
            <h3 id="fill-form-title">Questions for {selectedEmployee.employee_name}</h3>
            <div className="questions-list">
              {questions.length > 0 ? (
                questions.map((q) => (
                  <label key={q.id} className="question-item">
                    <input
                      type="checkbox"
                      checked={responses[q.id] || false}
                      onChange={() => toggleCheckbox(q.id)}
                    />
                    {q.text}{" "}
                    {q.is_concerned_question && (
                      <span className="concerned-tag">(Concerned)</span>
                    )}
                  </label>
                ))
              ) : (
                <p>No questions available for this employee.</p>
              )}
            </div>

            <h4 style={{ marginTop: "20px", marginBottom: "10px" }}>
              Department Comments
            </h4>
            <textarea
              className="comment-box"
              placeholder="Enter comments about this employee's exit..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows="4"
              aria-label="Department comments"
            />

            <h4 style={{ marginTop: "20px", marginBottom: "10px" }}>
              Details of Authorized Person <i>(Employee ID & Name)</i>
            </h4>
            <input
              type="text"
              className="department-head-id-input"
              placeholder="Enter Department Head ID & Name"
              value={departmentHeadId}
              onChange={(e) => setDepartmentHeadId(e.target.value)}
              required
              aria-label="Department Head ID and Name"
            />
            <div className="popup-actions">
              <button className="submit-btn" onClick={handleSubmitResponses}>
                Submit
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setSelectedEmployee(null);
                  setComment("");
                  setDepartmentHeadId("");
                  setCurrentCommentId(null);
                  setResponses({}); // Reset responses on cancel
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Form Popup */}
      {viewEmployee && (
        <div className="form-popup" role="dialog" aria-modal="true" aria-labelledby="view-form-title">
          <div className="form-popup-content">
            <h3 id="view-form-title">Form for {viewEmployee.employee_name}</h3>
            <p>
              <strong>Name:</strong> {viewEmployee.employee_name}
            </p>
            <p>
              <strong>ID:</strong> {viewEmployee.employee_id}
            </p>
            <p>
              <strong>Employee's Department:</strong>{" "}
              {viewEmployee.employee_department || "N/A"}
            </p>
            <p>
              <strong>Status:</strong> {viewEmployee.status}
            </p>
            <div className="questions-list">
              <h4 style={{ marginTop: "20px", marginBottom: "10px" }}>
                Questions:
              </h4>
              {viewEmployee.questions.length > 0 ? (
                viewEmployee.questions.map((q) => (
                  <p key={q.id}>
                    {q.text}{" "}
                    {q.is_concerned_question && (
                      <span className="concerned-tag">(Concerned)</span>
                    )}{" "}
                    – <strong>{q.is_checked ? "✔️ Done" : "❌ Pending"}</strong>
                  </p>
                ))
              ) : (
                <p>No questions available for this employee.</p>
              )}
            </div>

            <p style={{ marginTop: "20px" }}>
              <strong>Department Comments:</strong>{" "}
              {viewEmployee.viewComment}
            </p>
            <p>
              <strong>Details of Authorized Person:</strong>{" "}
              {viewEmployee.viewDepartmentHeadId}
            </p>
            <div className="popup-actions">
              <button
                className="cancel-btn"
                onClick={() => setViewEmployee(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DepartmentPage;