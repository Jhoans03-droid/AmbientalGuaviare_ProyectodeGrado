
const API = {
    async request(url, options = {}) {
        const token = localStorage.getItem('token');

        const headers = {
            ...(options.headers || {})
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        if (!(options.body instanceof FormData) && options.body) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch('/api' + url, {
            ...options,
            headers
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');

            if (!location.pathname.endsWith('login.html')) {
                location.href = '/login.html';
            }
        }

        if (!response.ok) {
            throw new Error(data.mensaje || 'Error en la operación');
        }

        return data;
    },

    get(url) {
        return this.request(url);
    },

    post(url, data) {
        return this.request(url, {
            method: 'POST',
            body: data instanceof FormData
                ? data
                : JSON.stringify(data)
        });
    },

    put(url, data) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
};

function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
}

function exigirSesion() {
    if (!localStorage.getItem('token')) {
        location.href = '/login.html';
        return false;
    }

    return true;
}

function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    location.href = '/login.html';
}
