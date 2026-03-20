const API_BASE_URL = 'http://localhost:8080/api';

async function handleResponse(response: Response) {
    if (!response.ok) {
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } else {
                const text = await response.text();
                if (text && text.length < 100) errorMessage = text;
            }
        } catch (e) {
            console.error('Failed to parse error response body:', e);
        }
        throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }
    return null;
}

const getHeaders = (token?: string) => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

export const api = {
    // Workforce
    getWorkers: (plantationId?: number | string, token?: string) => fetch(`${API_BASE_URL}/workforce/workers${plantationId ? `?plantationId=${plantationId}` : ''}`, {
        headers: getHeaders(token)
    }).then(handleResponse),

    assignWorker: (userId: number, functions: string, plantationId: number, pin: string, token?: string) =>
        fetch(`${API_BASE_URL}/workforce/workers/assign?userId=${userId}&functions=${functions}&plantationId=${plantationId}&pin=${pin}`, {
            method: 'POST',
            headers: getHeaders(token)
        }).then(handleResponse),

    getAvailableUsers: (token?: string) => fetch(`${API_BASE_URL}/workforce/users/available`, {
        headers: getHeaders(token)
    }).then(handleResponse),
    updateWorker: (id: string | number, data: any, token?: string) => fetch(`${API_BASE_URL}/workforce/workers/${id}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    deactivateWorker: (id: string | number, token?: string) => fetch(`${API_BASE_URL}/workforce/workers/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token)
    }).then(res => res.ok),
    deleteWorker: (id: string | number, token?: string) => fetch(`${API_BASE_URL}/workforce/workers/${id}/permanent`, {
        method: 'DELETE',
        headers: getHeaders(token)
    }).then(res => res.ok),
    generateWorkerQr: (id: string | number, token?: string) => fetch(`${API_BASE_URL}/workforce/workers/${id}/generate-qr`, {
        method: 'POST',
        headers: getHeaders(token)
    }).then(handleResponse),

    // Attendance
    getAttendance: (plantationId?: string | number, token?: string) =>
        fetch(`${API_BASE_URL}/workforce/attendance${plantationId ? `?plantationId=${plantationId}` : ''}`, {
            headers: getHeaders(token)
        }).then(handleResponse),
    scanQrAttendance: (qrCode: string, plantationId: string | number, token?: string) => fetch(`${API_BASE_URL}/workforce/attendance/scan?qrCode=${qrCode}&plantationId=${plantationId}`, {
        method: 'POST',
        headers: getHeaders(token)
    }).then(handleResponse),
    checkIn: (workerId: string | number, token?: string) => fetch(`${API_BASE_URL}/workforce/attendance/check-in/${workerId}`, {
        method: 'POST',
        headers: getHeaders(token)
    }).then(handleResponse),
    checkOut: (attendanceId: string | number, token?: string) => fetch(`${API_BASE_URL}/workforce/attendance/check-out/${attendanceId}`, {
        method: 'POST',
        headers: getHeaders(token)
    }).then(handleResponse),

    // Tasks
    getTasks: (month?: string, plantationId?: string | number, token?: string) => {
        const queryParams = new URLSearchParams();
        if (month) queryParams.append('month', month);
        if (plantationId) queryParams.append('plantationId', plantationId.toString());
        return fetch(`${API_BASE_URL}/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`, {
            headers: getHeaders(token)
        }).then(handleResponse);
    },
    createTask: (data: any, token?: string) => fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    updateTaskStatus: (id: string | number, status: string, token?: string) => fetch(`${API_BASE_URL}/tasks/${id}/status?status=${status}`, {
        method: 'PUT',
        headers: getHeaders(token)
    }).then(handleResponse),
    updateTask: (id: string | number, data: any, token?: string) => fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    deleteTask: (id: string | number, token?: string) => fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token)
    }).then(res => res.ok),
    getTasksByWorker: (workerId: string | number, token?: string) => fetch(`${API_BASE_URL}/tasks/worker/${workerId}`, {
        headers: getHeaders(token)
    }).then(handleResponse),

    getAttendanceByWorker: (workerId: string | number, token?: string) => fetch(`${API_BASE_URL}/workforce/attendance/worker/${workerId}`, {
        headers: getHeaders(token)
    }).then(handleResponse),
    recordAttendance: (data: any, token?: string) => fetch(`${API_BASE_URL}/workforce/attendance/manual`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    updateAttendance: (id: number | string, data: any, token?: string) => fetch(`${API_BASE_URL}/workforce/attendance/${id}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    deleteAttendance: (id: number | string, token?: string) => fetch(`${API_BASE_URL}/workforce/attendance/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token)
    }).then(res => res.ok),
    getLeavesByWorker: (workerId: string | number, token?: string) => fetch(`${API_BASE_URL}/workforce/leaves/worker/${workerId}`, {
        headers: getHeaders(token)
    }).then(handleResponse),
    getHarvestsByWorker: (workerId: string | number, token?: string) => fetch(`${API_BASE_URL}/harvests/worker/${workerId}`, {
        headers: getHeaders(token)
    }).then(handleResponse),

    // Registry (Plots)
    getPlots: (plantationId?: string | number, token?: string) =>
        fetch(`${API_BASE_URL}/registry/plots${plantationId ? `?plantationId=${plantationId}` : ''}`, {
            headers: getHeaders(token)
        }).then(handleResponse),
    createPlot: (data: any, plantationId?: number | string, token?: string) => fetch(`${API_BASE_URL}/registry/plots${plantationId ? `?plantationId=${plantationId}` : ''}`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    updatePlot: (id: string | number, data: any, token?: string) => fetch(`${API_BASE_URL}/registry/plots/${id}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    deletePlot: (id: string | number, token?: string) => fetch(`${API_BASE_URL}/registry/plots/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token)
    }).then(res => res.ok),
    getSoilTestsByPlot: (plotId: string | number, token?: string) => fetch(`${API_BASE_URL}/registry/plots/${plotId}/soil-tests`, {
        headers: getHeaders(token)
    }).then(handleResponse),

    // Harvest
    getHarvests: (month?: string, plantationId?: string | number, token?: string) => {
        const queryParams = new URLSearchParams();
        if (month) queryParams.append('month', month);
        if (plantationId) queryParams.append('plantationId', plantationId.toString());
        return fetch(`${API_BASE_URL}/harvests${queryParams.toString() ? `?${queryParams.toString()}` : ''}`, {
            headers: getHeaders(token)
        }).then(handleResponse);
    },
    recordHarvest: (data: any, token?: string) => fetch(`${API_BASE_URL}/harvests`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    updateHarvest: (id: number | string, data: any, token?: string) => fetch(`${API_BASE_URL}/harvests/${id}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    deleteHarvest: (id: number | string, token?: string) => fetch(`${API_BASE_URL}/harvests/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token)
    }).then(res => res.ok),

    // Inventory
    getInventoryItems: (plantationId?: string | number, token?: string) =>
        fetch(`${API_BASE_URL}/inventory/items${plantationId ? `?plantationId=${plantationId}` : ''}`, {
            headers: getHeaders(token)
        }).then(handleResponse),
    createInventoryItem: (data: any, plantationId?: number | string, token?: string) => fetch(`${API_BASE_URL}/inventory/items${plantationId ? `?plantationId=${plantationId}` : ''}`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    updateInventoryItem: (id: number | string, data: any, token?: string) => fetch(`${API_BASE_URL}/inventory/items/${id}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    deleteInventoryItem: (id: number | string, token?: string) => fetch(`${API_BASE_URL}/inventory/items/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token)
    }).then(res => res.ok),
    recordStockEntry: (itemId: number, quantity: number, type: string, unitPrice?: number, token?: string) =>
        fetch(`${API_BASE_URL}/inventory/stock-entry?itemId=${itemId}&quantity=${quantity}&type=${type}${unitPrice ? `&unitPrice=${unitPrice}` : ''}`, {
            method: 'POST',
            headers: getHeaders(token)
        }).then(handleResponse),
    getStockEntries: (plantationId?: string | number, token?: string) =>
        fetch(`${API_BASE_URL}/inventory/stock-entries${plantationId ? `?plantationId=${plantationId}` : ''}`, {
            headers: getHeaders(token)
        }).then(handleResponse),
    updateStockEntry: (id: number | string, quantity: number, unitPrice?: number, token?: string) =>
        fetch(`${API_BASE_URL}/inventory/stock-entries/${id}?quantity=${quantity}${unitPrice ? `&unitPrice=${unitPrice}` : ''}`, {
            method: 'PUT',
            headers: getHeaders(token)
        }).then(handleResponse),
    deleteStockEntry: (id: number | string, token?: string) => fetch(`${API_BASE_URL}/inventory/stock-entries/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token)
    }).then(res => res.ok),

    // Task Rates
    getTaskRates: (token?: string) => fetch(`${API_BASE_URL}/task-rates`, {
        headers: getHeaders(token)
    }).then(handleResponse),
    createTaskRate: (data: any, token?: string) => fetch(`${API_BASE_URL}/task-rates`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    updateTaskRate: (id: string | number, data: any, token?: string) => fetch(`${API_BASE_URL}/task-rates/${id}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    deleteTaskRate: (id: string | number, token?: string) => fetch(`${API_BASE_URL}/task-rates/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token)
    }).then(res => res.ok),

    // Financial
    getInventoryExpenses: (month: string, plantationId?: string | number, token?: string) => {
        const queryParams = new URLSearchParams({ month });
        if (plantationId) queryParams.append('plantationId', plantationId.toString());
        return fetch(`${API_BASE_URL}/financial/expenses/inventory?${queryParams.toString()}`, {
            headers: getHeaders(token)
        }).then(handleResponse);
    },
    getPayrolls: (month?: string, plantationId?: string | number, token?: string) => {
        const queryParams = new URLSearchParams();
        if (month) queryParams.append('month', month);
        if (plantationId) queryParams.append('plantationId', plantationId.toString());
        return fetch(`${API_BASE_URL}/financial/payroll${queryParams.toString() ? `?${queryParams.toString()}` : ''}`, {
            headers: getHeaders(token)
        }).then(handleResponse);
    },
    generatePayroll: (data: any, token?: string) => fetch(`${API_BASE_URL}/financial/payroll`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    updatePayrollStatus: (id: number, status: string, token?: string) => fetch(`${API_BASE_URL}/financial/payroll/${id}/status?status=${status}`, {
        method: 'PATCH',
        headers: getHeaders(token)
    }).then(handleResponse),
    updatePayroll: (id: string | number, data: any, token?: string) => fetch(`${API_BASE_URL}/financial/payroll/${id}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    deletePayroll: (id: string | number, token?: string) => fetch(`${API_BASE_URL}/financial/payroll/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token)
    }).then(res => res.ok),
    getPayrollPreview: (workerId: string | number, month: string, token?: string) =>
        fetch(`${API_BASE_URL}/financial/payroll/preview?workerId=${workerId}&month=${month}`, {
            headers: getHeaders(token)
        }).then(handleResponse),

    // Incomes
    getIncomes: (month?: string, plantationId?: string | number, token?: string) => {
        const queryParams = new URLSearchParams();
        if (month) queryParams.append('month', month);
        if (plantationId) queryParams.append('plantationId', plantationId.toString());
        return fetch(`${API_BASE_URL}/financial/incomes${queryParams ? `?${queryParams}` : ''}`, {
            headers: getHeaders(token)
        }).then(handleResponse);
    },
    createIncome: (data: any, plantationId?: number | string, token?: string) => fetch(`${API_BASE_URL}/financial/incomes${plantationId ? `?plantationId=${plantationId}` : ''}`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    updateIncome: (id: string | number, data: any, token?: string) => fetch(`${API_BASE_URL}/financial/incomes/${id}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    deleteIncome: (id: string | number, token?: string) => fetch(`${API_BASE_URL}/financial/incomes/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token)
    }).then(res => res.ok),

    // Factories
    getFactories: (plantationId?: string | number, token?: string) =>
        fetch(`${API_BASE_URL}/factories${plantationId ? `?plantationId=${plantationId}` : ''}`, {
            headers: getHeaders(token)
        }).then(handleResponse),
    createFactory: (data: any, plantationId?: number | string, token?: string) => fetch(`${API_BASE_URL}/factories${plantationId ? `?plantationId=${plantationId}` : ''}`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    updateFactory: (id: string | number, data: any, token?: string) => fetch(`${API_BASE_URL}/factories/${id}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    deleteFactory: (id: string | number, token?: string) => fetch(`${API_BASE_URL}/factories/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token)
    }).then(res => res.ok),

    // Deliveries
    getDeliveries: (month?: string, plantationId?: string | number, token?: string) => {
        const queryParams = new URLSearchParams();
        if (month) queryParams.append('month', month);
        if (plantationId) queryParams.append('plantationId', plantationId.toString());
        return fetch(`${API_BASE_URL}/factories/deliveries${queryParams.toString() ? `?${queryParams.toString()}` : ''}`, {
            headers: getHeaders(token)
        }).then(handleResponse);
    },
    recordDelivery: (data: any, plantationId?: number | string, token?: string) => fetch(`${API_BASE_URL}/factories/deliveries${plantationId ? `?plantationId=${plantationId}` : ''}`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    updateDelivery: (id: string | number, data: any, token?: string) => fetch(`${API_BASE_URL}/factories/deliveries/${id}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(data),
    }).then(handleResponse),
    deleteDelivery: (id: string | number, token?: string) => fetch(`${API_BASE_URL}/factories/deliveries/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token)
    }).then(res => res.ok),
    // Plantations
    createPlantation: (data: any, clerkId: string, token?: string) =>
        fetch(`${API_BASE_URL}/plantations?clerkId=${clerkId}`, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify(data),
        }).then(handleResponse),
    getPlantation: (clerkId: string, token?: string) =>
        fetch(`${API_BASE_URL}/plantations?clerkId=${clerkId}`, {
            headers: getHeaders(token)
        }).then(handleResponse),
    updatePlantation: (data: any, clerkId: string, token?: string) =>
        fetch(`${API_BASE_URL}/plantations?clerkId=${clerkId}`, {
            method: 'PUT',
            headers: getHeaders(token),
            body: JSON.stringify(data),
        }).then(res => res.ok),
    // Users
    getMe: (clerkId: string, token?: string) =>
        fetch(`${API_BASE_URL}/users/me?clerkId=${clerkId}`, {
            headers: getHeaders(token)
        }).then(handleResponse),
    updateUserProfile: (clerkId: string, data: any, token?: string) =>
        fetch(`${API_BASE_URL}/users/profile?clerkId=${clerkId}`, {
            method: 'PUT',
            headers: getHeaders(token),
            body: JSON.stringify(data),
        }).then(handleResponse),
    updatePin: (clerkId: string, pin: string, token?: string) =>
        fetch(`${API_BASE_URL}/users/pin?clerkId=${clerkId}&pin=${pin}`, {
            method: 'PUT',
            headers: getHeaders(token)
        }).then(res => res.ok),


    // Worker Dashboard
    getWorkerPlantations: (clerkId: string, token?: string) => {
        const headers = getHeaders(token);
        headers['X-User-Clerk-Id'] = clerkId;
        return fetch(`${API_BASE_URL}/worker/plantations`, {
            headers
        }).then(handleResponse);
    },

    getWorkerDashboard: (plantationId: number, clerkId: string, token?: string) => {
        const headers = getHeaders(token);
        headers['X-User-Clerk-Id'] = clerkId;
        return fetch(`${API_BASE_URL}/worker/dashboard/${plantationId}`, {
            headers
        }).then(handleResponse);
    },

    getWorkerTasks: (plantationId: number, clerkId: string, token?: string) => {
        const headers = getHeaders(token);
        headers['X-User-Clerk-Id'] = clerkId;
        return fetch(`${API_BASE_URL}/worker/tasks/${plantationId}`, {
            headers
        }).then(handleResponse);
    },

    getWorkerHarvests: (plantationId: number, clerkId: string, month?: string, token?: string) => {
        const headers = getHeaders(token);
        headers['X-User-Clerk-Id'] = clerkId;
        const queryParams = month ? `?month=${month}` : '';
        return fetch(`${API_BASE_URL}/worker/harvests/${plantationId}${queryParams}`, {
            headers
        }).then(handleResponse);
    },

    getWorkerAttendance: (plantationId: number, clerkId: string, month?: string, token?: string) => {
        const headers = getHeaders(token);
        headers['X-User-Clerk-Id'] = clerkId;
        const queryParams = month ? `?month=${month}` : '';
        return fetch(`${API_BASE_URL}/worker/attendance/${plantationId}${queryParams}`, {
            headers
        }).then(handleResponse);
    },

    getWorkerPayroll: (plantationId: number, clerkId: string, month?: string, token?: string) => {
        const headers = getHeaders(token);
        headers['X-User-Clerk-Id'] = clerkId;
        const queryParams = month ? `?month=${month}` : '';
        return fetch(`${API_BASE_URL}/worker/payroll/${plantationId}${queryParams}`, {
            headers
        }).then(handleResponse);
    },

    updateWorkerTaskStatus: (taskId: number, clerkId: string, status: string, token?: string) => {
        const headers = getHeaders(token);
        headers['X-User-Clerk-Id'] = clerkId;
        return fetch(`${API_BASE_URL}/worker/tasks/${taskId}/status`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ status }),
        }).then(handleResponse);
    },

    // Reports
    downloadHarvestReport: (plantationId: string | number, month: string, token?: string) =>
        fetch(`${API_BASE_URL}/reports/harvest?plantationId=${plantationId}&month=${month}-01`, {
            headers: getHeaders(token)
        }).then(res => res.blob()),

    downloadPayrollReport: (plantationId: string | number, month: string, token?: string) =>
        fetch(`${API_BASE_URL}/reports/payroll?plantationId=${plantationId}&month=${month}-01`, {
            headers: getHeaders(token)
        }).then(res => res.blob()),

    downloadInventoryReport: (plantationId: string | number, month: string, token?: string) =>
        fetch(`${API_BASE_URL}/reports/inventory?plantationId=${plantationId}&month=${month}-01`, {
            headers: getHeaders(token)
        }).then(res => res.blob()),

    downloadFinancialReport: (plantationId: string | number, month: string, token?: string) =>
        fetch(`${API_BASE_URL}/reports/financial?plantationId=${plantationId}&month=${month}-01`, {
            headers: getHeaders(token)
        }).then(res => res.blob()),

    downloadIncomeAnalysisReport: (plantationId: string | number, month: string, token?: string) =>
        fetch(`${API_BASE_URL}/reports/income-analysis?plantationId=${plantationId}&month=${month}-01`, {
            headers: getHeaders(token)
        }).then(res => res.blob()),

    async downloadWorkerPersonalReport(plantationId: number, month: string, clerkId: string, token?: string) {
        const response = await fetch(`${API_BASE_URL}/reports/worker-personal?plantationId=${plantationId}&month=${month}-01`, {
            headers: {
                ...getHeaders(token),
                'X-User-Clerk-Id': clerkId
            }
        });
        if (!response.ok) throw new Error('Failed to download report');
        return response.blob();
    },
};
