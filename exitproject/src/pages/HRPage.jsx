import React, { useEffect, useState, useMemo, useRef } from "react";
import api from "../api/api";
import "./styles/hrdashboard.css"; 
import { useNavigate } from "react-router-dom";

// Custom Alert Component
const CustomAlert = ({ message, type, onClose }) => {
  if (!message) return null;

  const alertStyle = {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "15px 25px",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: "bold",
    zIndex: 1000,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    backgroundColor: type === "success" ? "#4CAF50" : "#F44336", 
    display: "flex",
    alignItems: "center",
    gap: "10px",
  };

  const closeButtonStyle = {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: "1.2em",
    cursor: "pointer",
    marginLeft: "10px",
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Alert disappears after 5 seconds
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div style={alertStyle}>
      <span>{message}</span>
      <button onClick={onClose} style={closeButtonStyle}>
        &times;
      </button>
    </div>
  );
};

function HRPage() {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState({});
  const [deptForm, setDeptForm] = useState({
    name: "",
    email: "",
    is_assigned_department: false,
  });
  const [empForm, setEmpForm] = useState({
    employee_name: "",
    employee_id: "",
    employee_department: "", // This will now be set from the dropdown
    designation: "",
    status: "pending",
    last_work_date: "",
    type_of_separation: "resignation",
    assigned_departments: [],
  });
  const [qForm, setQForm] = useState({
    department: "",
    questions: [{ text: "", is_concerned_question: false }],
  });

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [empResponses, setEmpResponses] = useState(null);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showQuestionsForm, setShowQuestionsForm] = useState(false);

  // State for Custom Alert
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("success");

  // NEW: Filter states
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const employeesPerPage = 6;

  // NEW: State for Employee Department Dropdown with Search
  const [employeeDeptSearchTerm, setEmployeeDeptSearchTerm] = useState("");
  const [isEmployeeDeptDropdownOpen, setIsEmployeeDeptDropdownOpen] =
    useState(false);

  // Ref for the employee department dropdown container to detect outside clicks
  const employeeDeptDropdownRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
    fetchSummary();
  }, []);

  // Effect to handle clicks outside the employee department dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        employeeDeptDropdownRef.current &&
        !employeeDeptDropdownRef.current.contains(event.target)
      ) {
        setIsEmployeeDeptDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [employeeDeptDropdownRef]);

  const showAlert = (message, type) => {
    setAlertMessage(message);
    setAlertType(type);
  };

  const closeAlert = () => {
    setAlertMessage("");
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get("departments/", {
        headers: { Authorization: `Token ${localStorage.getItem("token")}` },
      });
      setDepartments(res.data);
    } catch (err) {
      showAlert("Failed to load departments.", "error");
      console.error("Error fetching departments:", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get("employees/", {
        headers: { Authorization: `Token ${localStorage.getItem("token")}` },
      });
      // NEW: Sort employees by created_at in descending order
      const sortedEmployees = res.data.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setEmployees(sortedEmployees);
    } catch (err) {
      showAlert("Failed to load employees.", "error");
      console.error("Error fetching employees:", err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get("employees/summary/", {
        headers: { Authorization: `Token ${localStorage.getItem("token")}` },
      });
      setSummary(res.data);
    } catch (err) {
      showAlert("Failed to load summary data.", "error");
      console.error("Error fetching summary:", err);
    }
  };

  // MODIFIED: Handle department form changes, including checkbox
  const handleDeptChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDeptForm({
      ...deptForm,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // MODIFIED: Added duplicate department check
  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    // Check for duplicate department name (case-insensitive)
    const isDuplicate = departments.some(
      (dept) => dept.name.toLowerCase() === deptForm.name.toLowerCase()
    );

    if (isDuplicate) {
      showAlert("Department with this name already exists!", "error");
      return;
    }

    try {
      const res = await api.post("departments/", deptForm, {
        headers: { Authorization: `Token ${localStorage.getItem("token")}` },
      });
      showAlert("Department added successfully!", "success");
      setDepartments([...departments, res.data]); // Ensure new department data includes is_assigned_department
      setDeptForm({ name: "", email: "", is_assigned_department: false });
      setShowDepartmentForm(false);
    } catch (err) {
      showAlert("Error creating department.", "error");
      console.error(err);
    }
  };

  const handleEmpChange = (e) => {
    const { name, value, type } = e.target;
    setEmpForm({
      ...empForm,
      [name]: type === "number" ? Number(value) : value,
    });
  };

  // NEW: Handle selection from the custom employee department dropdown
  const handleEmployeeDepartmentSelect = (selectedDepartmentName) => {
    setEmpForm({ ...empForm, employee_department: selectedDepartmentName });
    setIsEmployeeDeptDropdownOpen(false); // Close dropdown after selection
    setEmployeeDeptSearchTerm(""); // Clear search term
  };

  // MODIFIED: Filter departments for the searchable dropdown (all departments)
  const filteredEmployeeDepartments = useMemo(() => {
    if (!employeeDeptSearchTerm) {
      return departments;
    }
    return departments.filter((dept) =>
      dept.name.toLowerCase().includes(employeeDeptSearchTerm.toLowerCase())
    );
  }, [departments, employeeDeptSearchTerm]);

  // MODIFIED: Departments that are marked as 'is_assigned_department' for the checkboxes
  const assignableDepartments = useMemo(() => {
    return departments.filter((dept) => dept.is_assigned_department);
  }, [departments]);

  const handleDeptCheckboxChange = (id) => {
    const current = Array.isArray(empForm.assigned_departments)
      ? [...empForm.assigned_departments]
      : [];
    const idx = current.indexOf(id);
    if (idx === -1) current.push(id);
    else current.splice(idx, 1);
    setEmpForm({ ...empForm, assigned_departments: current });
  };

  const handleEmpSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("employees/", empForm, {
        headers: { Authorization: `Token ${localStorage.getItem("token")}` },
      });
      showAlert("Employee exit request created successfully!", "success");
      fetchEmployees();
      fetchSummary();
      setEmpForm({
        employee_name: "",
        employee_id: "",
        employee_department: "",
        designation: "",
        status: "pending",
        last_work_date: "",
        type_of_separation: "resignation",
        assigned_departments: [],
      });
      // NEW: Reset department search and close dropdown
      setEmployeeDeptSearchTerm("");
      setIsEmployeeDeptDropdownOpen(false);
      setShowEmployeeForm(false);
    } catch (err) {
      showAlert("Error creating employee exit request.", "error");
      console.error(err);
    }
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...qForm.questions];
    updated[index] = { ...updated[index], [field]: value };
    setQForm({ ...qForm, questions: updated });
  };

  const addQuestionField = () => {
    setQForm({
      ...qForm,
      questions: [
        ...qForm.questions,
        { text: "", is_concerned_question: false },
      ],
    });
  };

  const handleQSubmit = async (e) => {
    e.preventDefault();
    // Frontend validation for empty questions
    const hasEmptyQuestion = qForm.questions.some((q) => q.text.trim() === "");
    if (hasEmptyQuestion) {
      showAlert(
        "Please fill in all question fields or remove empty ones.",
        "error"
      );
      return;
    }

    try {
      for (let question of qForm.questions) {
        if (question.text.trim() === "") continue;
        await api.post(
          "questions/",
          {
            department: parseInt(qForm.department),
            text: question.text,
            is_concerned_question: question.is_concerned_question,
          },
          {
            headers: {
              Authorization: `Token ${localStorage.getItem("token")}`,
            },
          }
        );
      }
      showAlert("Department questions added successfully!", "success");
      setQForm({
        department: "",
        questions: [{ text: "", is_concerned_question: false }],
      }); // Reset form
      setShowQuestionsForm(false);
    } catch (err) {
      showAlert("Error adding questions.", "error");
      console.error(err);
    }
  };

  const handleView = async (emp) => {
    setSelectedEmployee(emp);
    try {
      const res = await api.get(`employees/${emp.id}/responses/`, {
        headers: { Authorization: `Token ${localStorage.getItem("token")}` },
      });
      setEmpResponses(res.data);
    } catch (err) {
      showAlert("Error fetching employee responses.", "error");
      console.error(err);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // NEW: Filtered Employees logic using useMemo for efficiency
  const filteredEmployees = useMemo(() => {
    let currentFiltered = employees;

    // Apply status filter
    if (statusFilter !== "All") {
      currentFiltered = currentFiltered.filter(
        (emp) => emp.status === statusFilter.toLowerCase()
      );
    }

    // Apply search query filter
    if (searchQuery) {
      currentFiltered = currentFiltered.filter(
        (emp) =>
          emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.employee_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return currentFiltered;
  }, [employees, statusFilter, searchQuery]);

  // Pagination logic for filtered employees
  const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);
  const indexOfLastEmployee = currentPage * employeesPerPage;
  const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;
  const currentEmployees = filteredEmployees.slice(
    indexOfFirstEmployee,
    indexOfLastEmployee
  );

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const formatDateTime = (isoString) => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return date.toLocaleDateString("en-US", options);
  };

  return (
    <div className="hr-dashboard modern">
      <CustomAlert
        message={alertMessage}
        type={alertType}
        onClose={closeAlert}
      />

      <header className="dashboard-header">
        <h1>HR Dashboard</h1>
        <button onClick={handleSignOut} className="sign-out-btn">
          Sign Out
        </button>
      </header>

      <section className="summary-section">
        <h2>Summary</h2>
        <div className="summary-cards">
          <div className="summary-card">
            <h3>Total Employees</h3>
            <p>{summary.total}</p>
          </div>
          <div className="summary-card pending">
            <h3>Pending</h3>
            <p>{summary.pending}</p>
          </div>
          <div className="summary-card in-progress">
            <h3>In Progress</h3>
            <p>{summary.inprogress}</p>
          </div>
          <div className="summary-card done">
            <h3>Done</h3>
            <p>{summary.done}</p>
          </div>
        </div>
      </section>

      <section className="request-forms-section">
        <h2>Create New Requests</h2>
        <div className="form-buttons">
          <button
            className={`form-toggle-btn ${showDepartmentForm ? "active" : ""}`}
            onClick={() => setShowDepartmentForm(!showDepartmentForm)}
          >
            {showDepartmentForm ? "Hide Department Form" : "Create Department"}
          </button>
          <button
            className={`form-toggle-btn ${showEmployeeForm ? "active" : ""}`}
            onClick={() => setShowEmployeeForm(!showEmployeeForm)}
          >
            {showEmployeeForm ? "Hide Employee Form" : "Create Exit Request"}
          </button>
          <button
            className={`form-toggle-btn ${showQuestionsForm ? "active" : ""}`}
            onClick={() => setShowQuestionsForm(!showQuestionsForm)}
          >
            {showQuestionsForm
              ? "Hide Questions Form"
              : "Create Department Questions"}
          </button>
        </div>

        {/* Department Form */}
        {showDepartmentForm && (
          <div className="form-container">
            <h3>Create Department</h3>
            <form onSubmit={handleDeptSubmit}>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="deptName">Department Name</label>
                  <input
                    id="deptName"
                    name="name"
                    placeholder="e.g., Human Resources"
                    value={deptForm.name}
                    onChange={handleDeptChange}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="deptEmail">Department Email</label>
                  <input
                    id="deptEmail"
                    name="email"
                    type="email"
                    placeholder="e.g., hr@example.com"
                    value={deptForm.email}
                    onChange={handleDeptChange}
                    required
                  />
                </div>
              </div>
              {/* NEW: Is Assigned Department checkbox */}
              <div className="form-row single">
                <div className="form-field checkbox-item-container">
                  {" "}
                  {/* New container for styling */}
                  <label
                    htmlFor="isAssignedDept"
                    className="checkbox-label-wrapper"
                  >
                    <input
                      type="checkbox"
                      id="isAssignedDept"
                      name="is_assigned_department"
                      checked={deptForm.is_assigned_department}
                      onChange={handleDeptChange}
                    />
                    <span className="checkbox-custom-style"></span>
                    <span className="checkbox-text">
                      Is an Assigned Department?
                    </span>
                  </label>
                  <small className="checkbox-description">
                    If checked, this department will appear in the "Assigned
                    Departments" list when creating an employee exit request.
                  </small>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn primary">
                  Add Department
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Employee Form */}
        {showEmployeeForm && (
          <div className="form-container">
            <h3>Create Exit Request</h3>
            <form onSubmit={handleEmpSubmit}>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="empName">Employee Name</label>
                  <input
                    id="empName"
                    name="employee_name"
                    placeholder="e.g., John Doe"
                    value={empForm.employee_name}
                    onChange={handleEmpChange}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="empId">Employee ID</label>
                  <input
                    id="empId"
                    name="employee_id"
                    placeholder="e.g., EMP001"
                    value={empForm.employee_id}
                    onChange={handleEmpChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row single">
                <div
                  className="form-field dropdown-search-container"
                  ref={employeeDeptDropdownRef}
                >
                  <label htmlFor="employeeDepartmentSearch">
                    Employee Department
                  </label>
                  <input
                    type="text"
                    id="employeeDepartmentSearch"
                    placeholder="Search or select department..."
                    value={
                      empForm.employee_department // If a department is selected, display its name
                        ? departments.find(
                            (d) => d.name === empForm.employee_department
                          )?.name || ""
                        : employeeDeptSearchTerm // Otherwise, display the search term
                    }
                    onChange={(e) => {
                      setEmployeeDeptSearchTerm(e.target.value);
                      setIsEmployeeDeptDropdownOpen(true);
                      // Clear employee_department when searching, so the input reflects search term
                      // Only clear if the current value is not what's being typed
                      if (
                        empForm.employee_department &&
                        empForm.employee_department !== e.target.value
                      ) {
                        setEmpForm({ ...empForm, employee_department: "" });
                      }
                    }}
                    onFocus={() => setIsEmployeeDeptDropdownOpen(true)}
                    className="dropdown-search-input"
                    autoComplete="off" // Disable browser autocomplete
                  />
                  {isEmployeeDeptDropdownOpen && (
                    <div className="dropdown-search-options-list">
                      {" "}
                      {/* Use a div for options list */}
                      {filteredEmployeeDepartments.length > 0 ? (
                        filteredEmployeeDepartments.map((d) => (
                          <div
                            key={d.id}
                            className="dropdown-option-item"
                            onClick={() =>
                              handleEmployeeDepartmentSelect(d.name)
                            }
                          >
                            {d.name}
                          </div>
                        ))
                      ) : (
                        <div className="dropdown-option-item no-results">
                          No departments found.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="designation">Designation</label>
                  <input
                    id="designation"
                    name="designation"
                    placeholder="e.g., Software Engineer"
                    value={empForm.designation}
                    onChange={handleEmpChange}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={empForm.status}
                    onChange={handleEmpChange}
                    className="styled-select" // Apply new class for styling
                  >
                    <option value="pending">Pending</option>
                    <option value="inprogress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>

              <div className="form-row single">
                <div className="form-field">
                  <label htmlFor="lastWorkDate">Last Work Date</label>
                  <input
                    id="lastWorkDate"
                    type="date"
                    name="last_work_date"
                    value={empForm.last_work_date}
                    onChange={handleEmpChange}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="separationType">Type of Separation</label>
                  <select
                    id="separationType"
                    name="type_of_separation"
                    value={empForm.type_of_separation}
                    onChange={handleEmpChange}
                    className="styled-select" // Apply new class for styling
                  >
                    <option value="resignation">Resignation</option>
                    <option value="termination">Termination</option>
                    <option value="retirement">Retirement</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* MODIFIED: Only show departments marked as is_assigned_department */}
              <div className="form-field assigned-depts">
                <label>Assigned Departments:</label>
                <div className="checkbox-grid">
                  {assignableDepartments.length > 0 ? (
                    assignableDepartments.map((d) => (
                      <label key={d.id} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={empForm.assigned_departments.includes(d.id)}
                          onChange={() => handleDeptCheckboxChange(d.id)}
                        />
                        <span className="checkbox-custom-style"></span>
                        <span>{d.name}</span>
                      </label>
                    ))
                  ) : (
                    <p className="no-assigned-depts-message">
                      No departments are marked as "Assigned Departments" for
                      employee assignment.
                    </p>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn primary">
                  Add Employee
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Questions Form */}
        {showQuestionsForm && (
          <div className="form-container">
            <h3>Create Department Questions</h3>
            <form onSubmit={handleQSubmit}>
              <div className="form-field">
                <label htmlFor="selectDepartment">Select Department</label>
                <select
                  id="selectDepartment"
                  value={qForm.department}
                  onChange={(e) =>
                    setQForm({ ...qForm, department: e.target.value })
                  }
                  required
                  className="styled-select" // Apply new class for styling
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              {qForm.questions.map((q, idx) => (
                <div className="form-field" key={idx}>
                  <label htmlFor={`question-${idx}`}>Question {idx + 1}</label>
                  <input
                    id={`question-${idx}`}
                    value={q.text}
                    onChange={(e) =>
                      handleQuestionChange(idx, "text", e.target.value)
                    }
                    placeholder={`Enter question ${idx + 1} here`}
                    required
                  />
                  <label className="checkbox-item concerned-checkbox checkbox-label-wrapper">
                    <input
                      type="checkbox"
                      checked={q.is_concerned_question}
                      onChange={(e) =>
                        handleQuestionChange(
                          idx,
                          "is_concerned_question",
                          e.target.checked
                        )
                      }
                    />
                    <span className="checkbox-custom-style"></span>
                    <span className="checkbox-text">
                      Mark as "Concerned Department" Question
                    </span>
                  </label>
                </div>
              ))}
              <div className="form-buttons-group">
                <button
                  type="button"
                  onClick={addQuestionField}
                  className="btn secondary"
                >
                  Add Another Question
                </button>
                <button type="submit" className="btn primary">
                  Save Questions
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      <section className="employee-list-section">
        <h2>Employees</h2>

        {/* NEW: Filter Section */}
        <div className="employee-filters">
          <div className="status-filter-buttons">
            <button
              className={`filter-btn ${statusFilter === "All" ? "active" : ""}`}
              onClick={() => setStatusFilter("All")}
            >
              All
            </button>
            <button
              className={`filter-btn ${
                statusFilter === "Pending" ? "active" : ""
              }`}
              onClick={() => setStatusFilter("Pending")}
            >
              Pending
            </button>
            <button
              className={`filter-btn ${
                statusFilter === "Inprogress" ? "active" : ""
              }`}
              onClick={() => setStatusFilter("Inprogress")}
            >
              In Progress
            </button>
            <button
              className={`filter-btn ${
                statusFilter === "Done" ? "active" : ""
              }`}
              onClick={() => setStatusFilter("Done")}
            >
              Done
            </button>
          </div>
          <div className="search-filter">
            <input
              type="text"
              placeholder="Search by Employee ID or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th>Emp. Dept</th>
                <th>Designation</th>
                <th>Status</th>
                <th>Last Work Date</th>
                <th>Separation</th>
                <th>Assigned Depts</th>
                <th>Submitted Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentEmployees.length > 0 ? (
                currentEmployees.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.employee_name}</td>
                    <td>{emp.employee_id}</td>
                    <td>{emp.employee_department}</td>
                    <td>{emp.designation}</td>
                    <td className={`status-cell status-${emp.status}`}>
                      {emp.status}
                    </td>
                    <td>{emp.last_work_date}</td>
                    <td>{emp.type_of_separation}</td>
                    <td>
                      {emp.assigned_departments
                        .map((id) => {
                          const dept = departments.find((d) => d.id === id);
                          return dept ? dept.name : id;
                        })
                        .join(", ")}
                    </td>
                    <td>{formatDateTime(emp.created_at)}</td>
                    <td>
                      <button
                        onClick={() => handleView(emp)}
                        className="view-btn"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="no-data-message">
                    No employees found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pagination-controls">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              Previous
            </button>
            <span className="page-info">
              Page{" "}
              <select
                value={currentPage}
                onChange={(e) => paginate(Number(e.target.value))}
                className="page-select styled-select" // Apply new class for styling
              >
                {[...Array(totalPages)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>{" "}
              of {totalPages}
            </span>
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Next
            </button>
          </div>
        )}
      </section>

      {selectedEmployee && empResponses && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">
              Responses for {empResponses.employee} ( Overall:{" "}
              <span
                className={`overall-status status-${empResponses.overall_status
                  .toLowerCase()
                  .replace(" ", "-")}`}
              >
                {empResponses.overall_status}
              </span>
              )
            </h3>

            <p>
              <strong>Employee's Department:</strong>{" "}
              {empResponses.employee_department || "N/A"}
            </p>

            <div className="modal-departments">
              {empResponses.departments.map((dept, idx) => (
                <div key={idx} className="department-response-card">
                  <h4>
                    {dept.department} —{" "}
                    <span className={`status-indicator status-${dept.status}`}>
                      {dept.status}
                    </span>
                  </h4>
                  <ul>
                    {dept.questions.map((q) => (
                      <li key={q.id}>
                        <input
                          type="checkbox"
                          checked={q.is_checked}
                          readOnly
                        />
                        {q.text}{" "}
                        {q.is_concerned_question && (
                          <span className="concerned-tag">(Concerned)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="dept-comment-display">
                    <strong>Comment from {dept.department}:</strong>{" "}
                    {dept.comment || "No comments provided."}
                    <br />
                    <strong>Department Head ID:</strong>{" "}
                    {dept.department_head_id || "N/A"}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedEmployee(null)}
              className="modal-close-btn"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HRPage;
