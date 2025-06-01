class ThemeManager {
  constructor() {
    this.darkModeToggle = document.getElementById('darkModeToggle');
    this.init();
  }

  init() {
    const savedTheme = localStorage.getItem('theme'); 
    const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      this.setTheme(savedTheme);
    } else if (systemDarkMode) {
      this.setTheme('dark');
    } else {
      this.setTheme('light');
    }

    this.darkModeToggle.addEventListener('change', () => {
      const newTheme = this.darkModeToggle.checked ? 'dark' : 'light';
      this.setTheme(newTheme);
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      this.darkModeToggle.checked = true;
    } else {
      document.documentElement.removeAttribute('data-theme');
      this.darkModeToggle.checked = false;
    }
    
    localStorage.setItem('theme', theme);
    
    document.body.style.transition = 'all 0.5s ease'; //Cambiar tema suave o rápido
    setTimeout(() => {
      document.body.style.transition = '';
    }, 500);
  }

  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }
}

class CalculadoraSubred {
  constructor() {
    this.form = document.getElementById('subnetForm');
    this.deviceList = document.getElementById('deviceList');
    this.addDeviceBtn = document.getElementById('addDevice');
    this.resultSection = document.getElementById('result');
    this.init();
  }

  // Funciones de conversión IP
  ipToInt(ip) {
    return ip.split('.').reduce((acc, oct) => (acc << 8) + +oct, 0) >>> 0;
  }

  intToIp(int) {
    return [24, 16, 8, 0].map(s => (int >>> s) & 255).join('.');
  }

  cidrToMask(cidr) {
    return 0xffffffff << (32 - cidr) >>> 0;
  }

  init() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    this.addDeviceBtn.addEventListener('click', () => this.addDeviceRow());
    this.updateRemoveButtons();
  }

  addDeviceRow() {
    const deviceRow = document.createElement('div');
    deviceRow.className = 'deviceRow';
    deviceRow.innerHTML = `
      <div class="device-input-group">
        <input type="text" class="dtype" placeholder="Tipo (PC, impresora…)" required />
        <input type="number" class="dqty" placeholder="Cantidad" min="1" required />
        <button type="button" class="remove-device">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    
    this.deviceList.appendChild(deviceRow);
    this.updateRemoveButtons();
    
    deviceRow.style.opacity = '0';
    deviceRow.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      deviceRow.style.transition = 'all 0.3s ease';
      deviceRow.style.opacity = '1';
      deviceRow.style.transform = 'translateY(0)';
    }, 10);
  }

  updateRemoveButtons() {
    const removeButtons = this.deviceList.querySelectorAll('.remove-device');
    const deviceRows = this.deviceList.querySelectorAll('.deviceRow');
    
    removeButtons.forEach((btn, index) => {
      btn.style.display = deviceRows.length > 1 ? 'flex' : 'none';
      btn.replaceWith(btn.cloneNode(true));
    });
    
    this.deviceList.querySelectorAll('.remove-device').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const deviceRow = e.target.closest('.deviceRow');
        deviceRow.style.transition = 'all 0.3s ease';
        deviceRow.style.opacity = '0';
        deviceRow.style.transform = 'translateX(-20px)';
        setTimeout(() => {
          deviceRow.remove();
          this.updateRemoveButtons();
        }, 300);
      });
    });
  }

  handleSubmit(e) {
    e.preventDefault();
    
    // Mostrar loading state
    this.showLoading();
    
    // Simular tiempo de cálculo para mejor UX
    setTimeout(() => {
      this.calculate();
    }, 800);
  }

  showLoading() {
    this.resultSection.innerHTML = `
      <div class="loading">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Calculando subredes...</p>
      </div>
    `;
  }

  calculate() {
    try {
      // Obtener datos del formulario
      const ipStr = document.getElementById('ip').value.trim();
      const maskStr = document.getElementById('mask').value.trim();
      const devices = this.getDevicesData();
      
      // Validar datos
      if (!ipStr || !maskStr || devices.length === 0) {
        this.showError('Por favor completa todos los campos');
        return;
      }

      // Calcular total de hosts necesarios
      const totalDevices = devices.reduce((sum, device) => sum + device.quantity, 0);
      const hosts = totalDevices;

      // Normalizar máscara (tu lógica)
      const cidr = maskStr.startsWith('/') ?
        parseInt(maskStr.slice(1), 10) :
        maskStr.split('.').reduce((c, o) => c + (o === '255' ? 8 : o === '254' ? 7 : o === '252' ? 6 : o === '248' ? 5 : o === '240' ? 4 : o === '224' ? 3 : o === '192' ? 2 : o === '128' ? 1 : 0), 0);

      // Cálculo de nueva máscara
      const hostsNecesarios = hosts + 2; // +2 para red y broadcast
      const hostBits = Math.ceil(Math.log2(hostsNecesarios));
      const nuevaCidr = 32 - hostBits;

      // Validar que la nueva máscara sea válida
      if (nuevaCidr < 8 || nuevaCidr > 30) {
        this.showError('Número de hosts demasiado grande o pequeño para calcular una subred válida');
        return;
      }

      const ipInt = this.ipToInt(ipStr);
      const mascara = this.cidrToMask(nuevaCidr);
      const red = ipInt & mascara;
      const broadcast = red | (~mascara >>> 0);

      // Mostrar resultados
      this.showResults({
        ipOriginal: ipStr,
        mascaraOriginal: maskStr,
        devices: devices,
        totalHosts: hosts,
        hostsNecesarios: hostsNecesarios,
        nuevaCidr: nuevaCidr,
        mascaraOptima: this.intToIp(mascara),
        direccionRed: this.intToIp(red),
        direccionBroadcast: this.intToIp(broadcast),
        rangoInicio: this.intToIp(red + 1),
        rangoFin: this.intToIp(broadcast - 1),
        hostsDisponibles: Math.pow(2, hostBits) - 2,
        calculatedAt: new Date().toLocaleString()
      });

    } catch (error) {
      console.error('Error en el cálculo:', error);
      this.showError('Error en el cálculo. Verifica que la IP y máscara sean válidas.');
    }
  }

  getDevicesData() {
    const deviceRows = this.deviceList.querySelectorAll('.deviceRow');
    const devices = [];
    
    deviceRows.forEach(row => {
      const type = row.querySelector('.dtype').value.trim();
      const quantity = parseInt(row.querySelector('.dqty').value);
      
      if (type && quantity && quantity > 0) {
        devices.push({ type, quantity });
      }
    });
    
    return devices;
  }

  showResults(data) {
    this.resultSection.innerHTML = `
      <div class="results-content">
        <h3><i class="fas fa-network-wired"></i> Resultados del Cálculo de Subredes</h3>
        
        <div class="result-grid">
          <div class="result-item result-summary">
            <strong><i class="fas fa-info-circle"></i> Resumen</strong>
            <div class="summary-content">
              <p><strong>IP original:</strong> ${data.ipOriginal}</p>
              <p><strong>Máscara original:</strong> ${data.mascaraOriginal}</p>
              <p><strong>Total dispositivos:</strong> ${data.totalHosts}</p>
            </div>
          </div>

          <div class="result-item result-devices">
            <strong><i class="fas fa-devices"></i> Dispositivos por tipo</strong>
            <ul class="devices-list">
              ${data.devices.map(d => `<li><span class="device-count">${d.quantity}</span> ${d.type}</li>`).join('')}
            </ul>
          </div>

          <div class="result-item result-network">
            <strong><i class="fas fa-globe"></i> Configuración de Red Óptima</strong>
            <div class="network-config">
              <p><strong>Máscara óptima:</strong> <code>/${data.nuevaCidr}</code> <span class="mask-decimal">(${data.mascaraOptima})</span></p>
              <p><strong>Dirección de red:</strong> <code>${data.direccionRed}</code></p>
              <p><strong>Dirección de broadcast:</strong> <code>${data.direccionBroadcast}</code></p>
            </div>
          </div>

          <div class="result-item result-range">
            <strong><i class="fas fa-ethernet"></i> Rango de IPs Utilizables</strong>
            <div class="ip-range">
              <p class="range-text">
                <code class="ip-start">${data.rangoInicio}</code>
                <span class="range-separator">—</span>
                <code class="ip-end">${data.rangoFin}</code>
              </p>
              <p class="hosts-available">
                <i class="fas fa-check-circle"></i>
                <strong>${data.hostsDisponibles}</strong> hosts disponibles
                <span class="efficiency">(${data.totalHosts} necesarios)</span>
              </p>
            </div>
          </div>
        </div>

        <div class="result-footer">
          <div class="calculation-time">
            <i class="fas fa-clock"></i>
            Calculado el ${data.calculatedAt}
          </div>
          <div class="efficiency-indicator ${this.getEfficiencyClass(data.totalHosts, data.hostsDisponibles)}">
            <i class="fas fa-chart-pie"></i>
            Eficiencia: ${Math.round((data.totalHosts / data.hostsDisponibles) * 100)}%
          </div>
        </div>
      </div>
    `;
  }

  getEfficiencyClass(needed, available) {
    const efficiency = (needed / available) * 100;
    if (efficiency >= 75) return 'efficiency-high';
    if (efficiency >= 50) return 'efficiency-medium';
    return 'efficiency-low';
  }

  showError(message) {
    this.resultSection.innerHTML = `
      <div class="error-content">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error en el cálculo</h3>
        <p>${message}</p>
        <button onclick="this.parentElement.parentElement.innerHTML = this.parentElement.parentElement.dataset.placeholder || 'Los resultados aparecerán aquí después del cálculo...'" class="retry-btn">
          <i class="fas fa-redo"></i> Intentar de nuevo
        </button>
      </div>
    `;
  }
}

// ===============================
// INICIALIZACIÓN
// ===============================

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar tema
  new ThemeManager();
  
  // Inicializar calculadora
  new CalculadoraSubred();
  
  console.log('🌐 Calculadora de Subredes iniciada correctamente');
});
