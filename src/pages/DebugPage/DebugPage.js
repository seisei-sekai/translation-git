import React, { useState, useEffect, useRef } from 'react';
import './DebugPage.css';
import { setGlobalState, getGlobalState } from '../../globalState';

function EditableCell({ value, column, rowId, tableName, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(
    typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef(null);

  const formatValue = (val) => {
    if (val === null) return 'null';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val, null, 2);
      } catch (e) {
        return String(val);
      }
    }
    return String(val);
  };

  const handleEdit = async () => {
    setIsLoading(true);
    setStatus(null);
    setErrorMessage('');
    
    let parsedValue = editValue;
    try {
      // Try to parse as JSON if the original value was an object
      if (typeof value === 'object') {
        parsedValue = JSON.parse(editValue);
      }

      const response = await fetch('/api/debug/update-cell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Debug-Password': getGlobalState('debugPwd'),
        },
        body: JSON.stringify({
          tableName,
          rowId,
          column,
          value: parsedValue
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update');
      }
      
      onUpdate(parsedValue);
      setStatus('success');
      setTimeout(() => {
        setIsEditing(false);
        setStatus(null);
      }, 1500);
    } catch (err) {
      console.error('Update error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to update');
      setEditValue(formatValue(value)); // Reset to original value
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Set cursor at the end
      inputRef.current.setSelectionRange(
        inputRef.current.value.length,
        inputRef.current.value.length
      );
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="editable-cell-container-debug">
        <textarea
          ref={inputRef}
          className="editable-cell-input-debug json-editor-debug"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => {
            if (!isLoading) {
              try {
                // Validate JSON if the original value was an object
                if (typeof value === 'object') {
                  JSON.parse(editValue);
                }
                handleEdit();
              } catch (e) {
                setStatus('error');
                setErrorMessage('Invalid JSON format');
                setEditValue(formatValue(value));
              }
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              e.preventDefault();
              handleEdit();
            } else if (e.key === 'Escape') {
              setIsEditing(false);
              setEditValue(formatValue(value));
            }
          }}
        />
        {isLoading && <div className="editable-cell-loading-debug">Updating...</div>}
        {status === 'success' && (
          <div className="editable-cell-status-debug success">Updated!</div>
        )}
        {status === 'error' && (
          <div className="editable-cell-status-debug error">{errorMessage}</div>
        )}
      </div>
    );
  }

  return (
    <div className="cell-container-debug">
      <div className="cell-content-debug">
        <pre className="json-display-debug">{formatValue(value)}</pre>
      </div>
      <button
        className="edit-cell-button-debug"
        onClick={() => setIsEditing(true)}
        title="Edit cell"
      >
        ✎
      </button>
    </div>
  );
}

function ResizableHeader({ column, width, onResize }) {
  const [isResizing, setIsResizing] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const headerRect = headerRef.current.getBoundingClientRect();
      const newWidth = Math.max(100, e.clientX - headerRect.left);
      onResize(column, newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, column, onResize]);

  return (
    <th 
      ref={headerRef}
      className="resizable-header-debug"
      style={{ width: width }}
    >
      {column}
      <div
        className="resize-handle-debug"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
      />
    </th>
  );
}

function TableDebugger({ tableName, columns, totalRecords }) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [countdown, setCountdown] = useState(1);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const autoRefreshInterval = useRef(null);
  const countdownInterval = useRef(null);
  const [columnWidths, setColumnWidths] = useState(
    columns.reduce((acc, column) => ({
      ...acc,
      [column]: 200 // default width
    }), {})
  );

  const fetchTableData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/debug/table-data/${tableName}?page=${page}&per_page=${perPage}`,
        {
          headers: {
            'Debug-Password': getGlobalState('debugPwd'),
          },
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result.data);
      setTotalPages(result.pagination.total_pages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoRefresh = () => {
    if (!autoRefresh) {
      setAutoRefresh(true);
      setCountdown(1);
      fetchTableData();
      autoRefreshInterval.current = setInterval(fetchTableData, 1000);
      countdownInterval.current = setInterval(() => {
        setCountdown(prev => prev > 0 ? prev - 1 : 1);
      }, 1000);
    } else {
      setAutoRefresh(false);
      clearInterval(autoRefreshInterval.current);
      clearInterval(countdownInterval.current);
      setCountdown(1);
    }
  };

  const handleCellUpdate = async (rowIndex, column, newValue) => {
    const updatedData = [...data];
    updatedData[rowIndex] = {
      ...updatedData[rowIndex],
      [column]: newValue
    };
    setData(updatedData);
  };

  const handleColumnResize = (column, newWidth) => {
    setColumnWidths(prev => ({
      ...prev,
      [column]: newWidth
    }));
  };

  useEffect(() => {
    if (expanded) {
      fetchTableData();
    }
    return () => {
      if (autoRefreshInterval.current) clearInterval(autoRefreshInterval.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, [expanded, page, perPage]);

  return (
    <div className="table-debugger-debug">
      <div 
        className="table-header-debug" 
        onClick={() => setExpanded(!expanded)}
      >
        <div className="table-title-debug">
          <span className="expand-icon-debug">{expanded ? '▼' : '▶'}</span>
          <h2>{tableName}</h2>
          <span className="record-count-debug">({totalRecords} records)</span>
        </div>
      </div>

      {expanded && (
        <div className="table-content-debug">
          <div className="table-controls-debug">
            <div className="pagination-controls-debug">
              <select 
                value={perPage} 
                onChange={(e) => setPerPage(Number(e.target.value))}
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
            <div className="refresh-controls-debug">
              <button 
                className="refresh-button-debug"
                onClick={fetchTableData}
                disabled={loading || autoRefresh}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
              <button 
                className={`auto-refresh-button-debug ${autoRefresh ? 'active' : ''}`}
                onClick={toggleAutoRefresh}
              >
                {autoRefresh ? `Auto-Refresh (${countdown}s)` : 'Auto-Refresh'}
              </button>
            </div>
          </div>

          {error && <div className="error-message-debug">{error}</div>}

          <div className="table-wrapper-debug">
            <table className="data-table-debug">
              <thead>
                <tr>
                  {columns.map(column => (
                    <ResizableHeader
                      key={column}
                      column={column}
                      width={columnWidths[column]}
                      onResize={handleColumnResize}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {columns.map(column => (
                      <td 
                        key={column}
                        style={{ width: columnWidths[column] }}
                      >
                        <EditableCell
                          value={row[column]}
                          column={column}
                          rowId={row.id}
                          tableName={tableName}
                          onUpdate={(newValue) => handleCellUpdate(rowIndex, column, newValue)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function OpenAIUsage() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [countdown, setCountdown] = useState(1);
  const autoRefreshInterval = useRef(null);
  const countdownInterval = useRef(null);

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/openai-usage', {
        headers: {
          'Debug-Password': getGlobalState('debugPwd'),
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setUsage(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoRefresh = () => {
    if (!autoRefresh) {
      setAutoRefresh(true);
      setCountdown(1);
      fetchUsage();
      autoRefreshInterval.current = setInterval(fetchUsage, 1000);
      countdownInterval.current = setInterval(() => {
        setCountdown(prev => prev > 0 ? prev - 1 : 1);
      }, 1000);
    } else {
      setAutoRefresh(false);
      clearInterval(autoRefreshInterval.current);
      clearInterval(countdownInterval.current);
      setCountdown(1);
    }
  };

  useEffect(() => {
    fetchUsage();
    return () => {
      if (autoRefreshInterval.current) clearInterval(autoRefreshInterval.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, []);

  return (
    <div className="openai-usage-debug">
      <div className="usage-header-debug">
        <h2>OpenAI Usage (Last 24 Hours)</h2>
        <div className="usage-controls-debug">
          <button 
            className="refresh-button-debug"
            onClick={fetchUsage}
            disabled={loading || autoRefresh}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button 
            className={`auto-refresh-button-debug ${autoRefresh ? 'active' : ''}`}
            onClick={toggleAutoRefresh}
          >
            {autoRefresh ? `Auto-Refresh (${countdown}s)` : 'Auto-Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="error-message-debug">{error}</div>}

      {usage && (
        <div className="usage-content-debug">
          <div className="usage-section-debug">
            <h3>Costs</h3>
            <div className="usage-data-debug">
              {usage.costs?.data?.map((bucket, index) => (
                <div key={index} className="usage-item-debug">
                  <div className="usage-time-debug">
                    {new Date(bucket.start_time * 1000).toLocaleString()} - 
                    {new Date(bucket.end_time * 1000).toLocaleString()}
                  </div>
                  {bucket.results?.map((result, idx) => (
                    <div key={idx} className="usage-result-debug">
                      <span>Amount: ${result.amount?.value || 0} {result.amount?.currency || 'USD'}</span>
                    </div>
                  ))}
                </div>
              )) || <div className="no-data-debug">No cost data available</div>}
            </div>
          </div>

          <div className="usage-section-debug">
            <h3>Audio Transcriptions</h3>
            <div className="usage-data-debug">
              {usage.audio_usage?.data?.map((bucket, index) => (
                <div key={index} className="usage-item-debug">
                  <div className="usage-time-debug">
                    {new Date(bucket.start_time * 1000).toLocaleString()} - 
                    {new Date(bucket.end_time * 1000).toLocaleString()}
                  </div>
                  {bucket.results?.map((result, idx) => (
                    <div key={idx} className="usage-result-debug">
                      <span>Seconds: {result.seconds || 0}</span>
                      <span>Requests: {result.num_model_requests || 0}</span>
                    </div>
                  ))}
                </div>
              )) || <div className="no-data-debug">No audio usage data available</div>}
            </div>
          </div>

          <div className="usage-section-debug">
            <h3>Completions</h3>
            <div className="usage-data-debug">
              {usage.completion_usage?.data?.map((bucket, index) => (
                <div key={index} className="usage-item-debug">
                  <div className="usage-time-debug">
                    {new Date(bucket.start_time * 1000).toLocaleString()} - 
                    {new Date(bucket.end_time * 1000).toLocaleString()}
                  </div>
                  {bucket.results?.map((result, idx) => (
                    <div key={idx} className="usage-result-debug">
                      <span>Input Tokens: {result.input_tokens || 0}</span>
                      <span>Output Tokens: {result.output_tokens || 0}</span>
                      <span>Cached Tokens: {result.input_cached_tokens || 0}</span>
                      <span>Requests: {result.num_model_requests || 0}</span>
                    </div>
                  ))}
                </div>
              )) || <div className="no-data-debug">No completion usage data available</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PasswordScreen({ onAuthenticate }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/debug/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      
      // Store password in global state
      setGlobalState('debugPwd', password);
      onAuthenticate(true);
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-screen-debug">
      <form onSubmit={handleSubmit} className="password-form-debug">
        <h2>Debug Access</h2>
        <div className="password-input-container-debug">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter debug password"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !password}>
            {loading ? 'Verifying...' : 'Access'}
          </button>
        </div>
        {error && <div className="error-message-debug">{error}</div>}
      </form>
    </div>
  );
}

function CreateReferCodePanel() {
  const [expanded, setExpanded] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    refer_code: '',
    refer_code_description: '',
    total_number: 1,
    refer_code_expiration_date: '',
    refer_code_activation_plan: 'basic'
  });
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setError('');

    try {
      const response = await fetch('/api/debug/create-refer-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Debug-Password': getGlobalState('debugPwd'),
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create refer code');
      }
      
      setStatus('success');
      // Reset form
      setFormData({
        name: '',
        refer_code: '',
        refer_code_description: '',
        total_number: 1,
        refer_code_expiration_date: '',
        refer_code_activation_plan: 'basic'
      });
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="table-debugger-debug">
      <div 
        className="table-header-debug"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="table-title-debug">
          <span className="expand-icon-debug">{expanded ? '▼' : '▶'}</span>
          <h2>Create Refer Code</h2>
        </div>
      </div>

      {expanded && (
        <div className="table-content-debug">
          <form onSubmit={handleSubmit} className="refer-code-form-debug">
            <div className="form-group-debug">
              <label>Name:</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group-debug">
              <label>Refer Code:</label>
              <input
                type="text"
                name="refer_code"
                value={formData.refer_code}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group-debug">
              <label>Description:</label>
              <textarea
                name="refer_code_description"
                value={formData.refer_code_description}
                onChange={handleChange}
                rows="3"
              />
            </div>

            <div className="form-group-debug">
              <label>Total Number:</label>
              <input
                type="number"
                name="total_number"
                value={formData.total_number}
                onChange={handleChange}
                min="1"
                required
              />
            </div>

            <div className="form-group-debug">
              <label>Expiration Date:</label>
              <input
                type="datetime-local"
                name="refer_code_expiration_date"
                value={formData.refer_code_expiration_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group-debug">
              <label>Activation Plan:</label>
              <select
                name="refer_code_activation_plan"
                value={formData.refer_code_activation_plan}
                onChange={handleChange}
                required
              >
                <option value="basic">Basic</option>
                <option value="monthly_onetime">Monthly One-time</option>
                <option value="annual_onetime">Annual One-time</option>
              </select>
            </div>

            <button 
              type="submit" 
              className="submit-button-debug"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Creating...' : 'Create Refer Code'}
            </button>

            {status === 'success' && (
              <div className="success-message-debug">Refer code created successfully!</div>
            )}
            {status === 'error' && (
              <div className="error-message-debug">{error}</div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

function DebugPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [tables, setTables] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDebugPanelVisible, setIsDebugPanelVisible] = useState(getGlobalState('isDebugPanelOn'));

  // Add toggle handler
  const handleDebugPanelToggle = () => {
    const newValue = !isDebugPanelVisible;
    setIsDebugPanelVisible(newValue);
    setGlobalState('isDebugPanelOn', newValue);
  };

  useEffect(() => {
    if (!authenticated) {
      setLoading(false);
      return;
    }

    const fetchTables = async () => {
      try {
        const response = await fetch('/api/debug/tables', {
          headers: {
            'Debug-Password': getGlobalState('debugPwd'),
          },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setTables(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTables();
  }, [authenticated]);

  if (!authenticated) {
    return <PasswordScreen onAuthenticate={setAuthenticated} />;
  }

  if (loading) return <div className="loading-debug">Loading tables...</div>;
  if (error) return <div className="error-message-debug">{error}</div>;

  return (
    <div className="debug-page-debug">
      <div className="debug-header-container">
        <h1>Database Tables Debug</h1>
        <button 
          className={`debug-panel-toggle ${isDebugPanelVisible ? 'active' : ''}`}
          onClick={handleDebugPanelToggle}
        >
          Debug Panel {isDebugPanelVisible ? 'On' : 'Off'}
        </button>
      </div>
      {isDebugPanelVisible && (
        <>
          <OpenAIUsage />
          <CreateReferCodePanel />
          <div className="tables-container-debug">
            {Object.entries(tables).map(([tableName, tableInfo]) => (
              <TableDebugger
                key={tableName}
                tableName={tableName}
                columns={tableInfo.columns}
                totalRecords={tableInfo.total_records}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default DebugPage;
