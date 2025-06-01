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

      // Normalizar máscara base
      const baseCidr = maskStr.startsWith('/') ?
        parseInt(maskStr.slice(1), 10) :
        maskStr.split('.').reduce((c, o) => c + (o === '255' ? 8 : o === '254' ? 7 : o === '252' ? 6 : o === '248' ? 5 : o === '240' ? 4 : o === '224' ? 3 : o === '192' ? 2 : o === '128' ? 1 : 0), 0);

      // Calcular subredes para cada tipo de dispositivo
      const subredes = this.calculateSubnets(ipStr, baseCidr, devices);
      
      if (subredes.error) {
        this.showError(subredes.error);
        return;
      }

      // Mostrar resultados
      this.showSubnetResults({
        ipOriginal: ipStr,
        mascaraOriginal: maskStr,
        baseCidr: baseCidr,
        subredes: subredes,
        calculatedAt: new Date().toLocaleString()
      });

    } catch (error) {
      console.error('Error en el cálculo:', error);
      this.showError('Error en el cálculo. Verifica que la IP y máscara sean válidas.');
    }
  }

  calculateSubnets(baseIp, baseCidr, devices) {
    // Ordenar dispositivos por cantidad (de mayor a menor) para optimizar el espacio
    const sortedDevices = [...devices].sort((a, b) => b.quantity - a.quantity);
    
    const baseIpInt = this.ipToInt(baseIp);
    const baseMask = this.cidrToMask(baseCidr);
    const baseNetwork = baseIpInt & baseMask;
    const maxAddressSpace = Math.pow(2, 32 - baseCidr);
    
    let currentNetwork = baseNetwork;
    const subredes = [];
    let totalUsedSpace = 0;
    
    for (const device of sortedDevices) {
      // Calcular hosts necesarios (cantidad + red + broadcast)
      const hostsNecesarios = device.quantity + 2;
      const hostBits = Math.ceil(Math.log2(hostsNecesarios));
      const subnetCidr = 32 - hostBits;
      
      // Validar que la subred sea válida
      if (subnetCidr < baseCidr || subnetCidr > 30) {
        return { error: `Subred para ${device.type} requiere demasiados hosts (${device.quantity}) para la red base` };
      }
      
      const subnetMask = this.cidrToMask(subnetCidr);
      const subnetSize = Math.pow(2, hostBits);
      
      // Verificar que hay espacio suficiente
      if (totalUsedSpace + subnetSize > maxAddressSpace) {
        return { error: `No hay suficiente espacio en la red base para todas las subredes` };
      }
      
      // Alinear la dirección de red al límite de la subred
      const alignedNetwork = Math.floor(currentNetwork / subnetSize) * subnetSize;
      if (alignedNetwork < currentNetwork) {
        currentNetwork = alignedNetwork + subnetSize;
      } else {
        currentNetwork = alignedNetwork;
      }
      
      const broadcast = currentNetwork + subnetSize - 1;
      const firstHost = currentNetwork + 1;
      const lastHost = broadcast - 1;
      
      subredes.push({
        tipo: device.type,
        cantidad: device.quantity,
        direccionRed: this.intToIp(currentNetwork),
        mascara: this.intToIp(subnetMask),
        cidr: subnetCidr,
        broadcast: this.intToIp(broadcast),
        primeraIP: this.intToIp(firstHost),
        ultimaIP: this.intToIp(lastHost),
        hostsDisponibles: subnetSize - 2,
        hostsNecesarios: device.quantity,
        eficiencia: Math.round((device.quantity / (subnetSize - 2)) * 100),
        tamaño: subnetSize
      });
      
      // Mover al siguiente bloque de direcciones
      currentNetwork += subnetSize;
      totalUsedSpace += subnetSize;
    }
    
    // Calcular estadísticas generales
    const totalDevices = devices.reduce((sum, d) => sum + d.quantity, 0);
    const totalHosts = subredes.reduce((sum, s) => sum + s.hostsDisponibles, 0);
    const eficienciaGeneral = Math.round((totalDevices / totalHosts) * 100);
    
    return {
      subredes,
      totalDevices,
      totalHosts,
      totalUsedSpace,
      availableSpace: maxAddressSpace - totalUsedSpace,
      eficienciaGeneral,
      espacioUtilizado: Math.round((totalUsedSpace / maxAddressSpace) * 100)
    };
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

  showSubnetResults(data) {
    const subnetCards = data.subredes.map((subnet, index) => `
      <div class="subnet-card ${this.getSubnetEfficiencyClass(subnet.eficiencia)}">
        <div class="subnet-header">
          <h4>
            <i class="fas fa-sitemap"></i>
            Subred ${index + 1}: ${subnet.tipo}
          </h4>
          <div class="efficiency-badge">
            ${subnet.eficiencia}% eficiencia
          </div>
        </div>
        
        <div class="subnet-details">
          <div class="subnet-row">
            <span class="label"><i class="fas fa-network-wired"></i> Red:</span>
            <code class="network-addr">${subnet.direccionRed}/${subnet.cidr}</code>
          </div>
          
          <div class="subnet-row">
            <span class="label"><i class="fas fa-shield-alt"></i> Máscara:</span>
            <code>${subnet.mascara}</code>
          </div>
          
          <div class="subnet-row">
            <span class="label"><i class="fas fa-broadcast-tower"></i> Broadcast:</span>
            <code>${subnet.broadcast}</code>
          </div>
          
          <div class="subnet-row range-row">
            <span class="label"><i class="fas fa-arrows-alt-h"></i> Rango:</span>
            <div class="ip-range-inline">
              <code class="ip-start">${subnet.primeraIP}</code>
              <span class="range-separator">→</span>
              <code class="ip-end">${subnet.ultimaIP}</code>
            </div>
          </div>
          
          <div class="subnet-stats">
            <div class="stat">
              <div class="stat-value">${subnet.cantidad}</div>
              <div class="stat-label">Necesarios</div>
            </div>
            <div class="stat">
              <div class="stat-value">${subnet.hostsDisponibles}</div>
              <div class="stat-label">Disponibles</div>
            </div>
            <div class="stat">
              <div class="stat-value">${subnet.tamaño}</div>
              <div class="stat-label">Tamaño Total</div>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    this.resultSection.innerHTML = `
      <div class="results-content">
        <h3><i class="fas fa-project-diagram"></i> Diseño de Subredes por Dispositivo</h3>
        
        <div class="summary-stats">
          <div class="summary-card">
            <div class="summary-icon">
              <i class="fas fa-info-circle"></i>
            </div>
            <div class="summary-info">
              <h4>Red Base</h4>
              <p><strong>${data.ipOriginal}${data.mascaraOriginal}</strong></p>
              <small>${data.subredes.length} subredes creadas</small>
            </div>
          </div>
          
          <div class="summary-card">
            <div class="summary-icon">
              <i class="fas fa-devices"></i>
            </div>
            <div class="summary-info">
              <h4>Dispositivos</h4>
              <p><strong>${data.subredes.totalDevices}</strong> total</p>
              <small>${data.subredes.totalHosts} IPs disponibles</small>
            </div>
          </div>
          
          <div class="summary-card">
            <div class="summary-icon efficiency-${this.getGeneralEfficiencyClass(data.subredes.eficienciaGeneral)}">
              <i class="fas fa-chart-pie"></i>
            </div>
            <div class="summary-info">
              <h4>Eficiencia</h4>
              <p><strong>${data.subredes.eficienciaGeneral}%</strong> general</p>
              <small>${data.subredes.espacioUtilizado}% del espacio usado</small>
            </div>
          </div>
        </div>

        <div class="subnets-container">
          <h4><i class="fas fa-list"></i> Configuración de Subredes</h4>
          <div class="subnets-grid">
            ${subnetCards}
          </div>
        </div>

        <div class="result-footer">
          <div class="calculation-time">
            <i class="fas fa-clock"></i>
            Calculado el ${data.calculatedAt}
          </div>
          <div class="space-usage">
            <i class="fas fa-hdd"></i>
            Espacio restante: ${data.subredes.availableSpace} direcciones
          </div>
        </div>
      </div>
    `;
  }

  getSubnetEfficiencyClass(efficiency) {
    if (efficiency >= 75) return 'subnet-high-efficiency';
    if (efficiency >= 50) return 'subnet-medium-efficiency';
    return 'subnet-low-efficiency';
  }

  getGeneralEfficiencyClass(efficiency) {
    if (efficiency >= 75) return 'high';
    if (efficiency >= 50) return 'medium';
    return 'low';
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
