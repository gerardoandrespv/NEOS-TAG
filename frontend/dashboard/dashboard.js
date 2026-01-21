// Neos Tech RFID Dashboard - Main JavaScript
class RFIDDashboard {
    constructor() {
        this.tags = [];
        this.readers = new Set();
        this.clients = new Set();
        this.charts = {};
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        try {
            this.log('Initializing RFID Dashboard...');
            
            // Check Firebase connection
            await this.checkFirebaseConnection();
            
            // Initialize Charts
            this.initCharts();
            
            // Load initial data
            await this.loadData();
            
            // Set up real-time listener
            this.setupRealtimeListener();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Auto-refresh every 30 seconds
            setInterval(() => this.loadData(), 30000);
            
            this.isInitialized = true;
            this.log('Dashboard initialized successfully');
            this.updateStatus('Connected', 'success');
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.log(`Initialization failed: ${error.message}`, 'error');
            this.updateStatus('Connection Error', 'danger');
        }
    }

    async checkFirebaseConnection() {
        try {
            // Try to get a Firestore document to test connection
            await db.collection('rfid_tags').limit(1).get();
            return true;
        } catch (error) {
            throw new Error(`Firebase connection failed: ${error.message}`);
        }
    }

    initCharts() {
        // Reader Chart (Bar)
        const readerCtx = document.getElementById('readerChart').getContext('2d');
        this.charts.readerChart = new Chart(readerCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Lecturas por Reader',
                    data: [],
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });

        // Client Chart (Pie)
        const clientCtx = document.getElementById('clientChart').getContext('2d');
        this.charts.clientChart = new Chart(clientCtx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    label: 'Distribución por Cliente',
                    data: [],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true
            }
        });
    }

    async loadData() {
        try {
            this.showLoading(true);
            
            // Get filters
            const readerFilter = document.getElementById('readerFilter').value;
            const clientFilter = document.getElementById('clientFilter').value;
            const hoursFilter = document.getElementById('timeFilter').value;
            
            // Build query
            let query = db.collection('rfid_tags').orderBy('timestamp', 'desc').limit(100);
            
            // Apply time filter
            if (hoursFilter !== 'all') {
                const hoursAgo = new Date();
                hoursAgo.setHours(hoursAgo.getHours() - parseInt(hoursFilter));
                query = query.where('timestamp', '>=', hoursAgo);
            }
            
            // Apply reader filter
            if (readerFilter !== 'all') {
                query = query.where('reader_id', '==', readerFilter);
            }
            
            // Apply client filter
            if (clientFilter !== 'all') {
                query = query.where('client_id', '==', clientFilter);
            }
            
            // Execute query
            const snapshot = await query.get();
            
            // Process data
            this.tags = [];
            this.readers.clear();
            this.clients.clear();
            
            snapshot.forEach(doc => {
                const data = doc.data();
                this.tags.push(data);
                this.readers.add(data.reader_id);
                this.clients.add(data.client_id);
            });
            
            // Update UI
            this.updateTable();
            this.updateStats();
            this.updateFilters();
            this.updateCharts();
            
            this.log(`Loaded ${this.tags.length} tags from Firestore`);
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.log(`Error loading data: ${error.message}`, 'error');
            this.showLoading(false);
        }
    }

    setupRealtimeListener() {
        // Listen for new tags in real-time
        db.collection('rfid_tags')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const newTag = change.doc.data();
                        this.log(`New tag detected: ${newTag.tag_id} from ${newTag.reader_id}`, 'success');
                        // Refresh data to show new tag
                        this.loadData();
                    }
                });
            }, error => {
                this.log(`Realtime listener error: ${error.message}`, 'error');
            });
    }

    updateTable() {
        const tbody = document.getElementById('rfidTableBody');
        tbody.innerHTML = '';
        
        this.tags.forEach(tag => {
            const row = document.createElement('tr');
            
            // Format timestamp
            const timestamp = new Date(tag.timestamp?.seconds * 1000 || tag.timestamp);
            const timeStr = timestamp.toLocaleString();
            
            // Status badge
            const statusClass = tag.status === 'active' ? 'badge bg-success' : 'badge bg-warning';
            const statusText = tag.status === 'active' ? 'Activo' : 'Inactivo';
            
            row.innerHTML = `
                <td><small class="text-muted">${tag.id || 'N/A'}</small></td>
                <td><code>${tag.tag_id}</code></td>
                <td><span class="badge bg-info">${tag.reader_id}</span></td>
                <td>${tag.client_id}</td>
                <td><small>${timeStr}</small></td>
                <td><span class="${statusClass}">${statusText}</span></td>
            `;
            
            tbody.appendChild(row);
        });
    }

    updateStats() {
        // Calculate today's tags
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tagsToday = this.tags.filter(tag => {
            const tagDate = new Date(tag.timestamp?.seconds * 1000 || tag.timestamp);
            return tagDate >= today;
        }).length;
        
        // Update stats
        document.getElementById('tagsToday').textContent = tagsToday;
        document.getElementById('activeReaders').textContent = this.readers.size;
        
        // Last read time
        if (this.tags.length > 0) {
            const lastTag = this.tags[0];
            const lastTime = new Date(lastTag.timestamp?.seconds * 1000 || lastTag.timestamp);
            document.getElementById('lastRead').textContent = lastTime.toLocaleTimeString();
        }
    }

    updateFilters() {
        // Update reader filter options
        const readerSelect = document.getElementById('readerFilter');
        const currentReader = readerSelect.value;
        
        // Clear all except first option
        while (readerSelect.options.length > 1) {
            readerSelect.remove(1);
        }
        
        // Add new options
        this.readers.forEach(reader => {
            const option = document.createElement('option');
            option.value = reader;
            option.textContent = reader;
            if (reader === currentReader) option.selected = true;
            readerSelect.appendChild(option);
        });
        
        // Update client filter options
        const clientSelect = document.getElementById('clientFilter');
        const currentClient = clientSelect.value;
        
        // Clear all except first option
        while (clientSelect.options.length > 1) {
            clientSelect.remove(1);
        }
        
        // Add new options
        this.clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client;
            option.textContent = client;
            if (client === currentClient) option.selected = true;
            clientSelect.appendChild(option);
        });
    }

    updateCharts() {
        // Reader Chart Data
        const readerCounts = {};
        this.tags.forEach(tag => {
            readerCounts[tag.reader_id] = (readerCounts[tag.reader_id] || 0) + 1;
        });
        
        this.charts.readerChart.data.labels = Object.keys(readerCounts);
        this.charts.readerChart.data.datasets[0].data = Object.values(readerCounts);
        this.charts.readerChart.update();
        
        // Client Chart Data
        const clientCounts = {};
        this.tags.forEach(tag => {
            clientCounts[tag.client_id] = (clientCounts[tag.client_id] || 0) + 1;
        });
        
        this.charts.clientChart.data.labels = Object.keys(clientCounts);
        this.charts.clientChart.data.datasets[0].data = Object.values(clientCounts);
        this.charts.clientChart.update();
    }

    setupEventListeners() {
        // Apply Filters button
        document.getElementById('applyFilters').addEventListener('click', () => {
            this.loadData();
        });
        
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadData();
        });
        
        // Export CSV button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportToCSV();
        });
        
        // Clear console button
        document.getElementById('clearConsole').addEventListener('click', () => {
            document.getElementById('debugConsole').innerHTML = '';
            this.log('Console cleared');
        });
        
        // Filter change events
        document.getElementById('readerFilter').addEventListener('change', () => this.loadData());
        document.getElementById('clientFilter').addEventListener('change', () => this.loadData());
        document.getElementById('timeFilter').addEventListener('change', () => this.loadData());
    }

    exportToCSV() {
        if (this.tags.length === 0) {
            alert('No hay datos para exportar');
            return;
        }
        
        // Create CSV content
        const headers = ['ID', 'Tag ID', 'Reader ID', 'Client ID', 'Timestamp', 'Status'];
        const rows = this.tags.map(tag => [
            tag.id || '',
            tag.tag_id || '',
            tag.reader_id || '',
            tag.client_id || '',
            new Date(tag.timestamp?.seconds * 1000 || tag.timestamp).toISOString(),
            tag.status || ''
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `neos-tech-rfid-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.log(`Exported ${this.tags.length} records to CSV`, 'success');
    }

    log(message, type = 'info') {
        const consoleDiv = document.getElementById('debugConsole');
        const timestamp = new Date().toLocaleTimeString();
        const color = type === 'error' ? 'text-danger' : type === 'success' ? 'text-success' : 'text-info';
        
        const logEntry = document.createElement('div');
        logEntry.innerHTML = `<span class="text-muted">[${timestamp}]</span> <span class="${color}">${message}</span>`;
        consoleDiv.appendChild(logEntry);
        
        // Auto-scroll to bottom
        consoleDiv.scrollTop = consoleDiv.scrollHeight;
    }

    updateStatus(message, type = 'info') {
        const statusEl = document.getElementById('firebaseStatus');
        statusEl.textContent = message;
        statusEl.className = type === 'success' ? 'text-success' : type === 'error' ? 'text-danger' : 'text-info';
    }

    showLoading(show) {
        const loadingEl = document.getElementById('loading');
        const tableBody = document.getElementById('rfidTableBody');
        
        if (show) {
            loadingEl.style.display = 'block';
            tableBody.style.opacity = '0.5';
        } else {
            loadingEl.style.display = 'none';
            tableBody.style.opacity = '1';
        }
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.rfidDashboard = new RFIDDashboard();
});
