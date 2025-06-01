const i18n = {
  es: {
    title: 'Logical Network Design Calculator',
    subtitle: 'Una pequeña ayuda para Redes',
    ipLabel: 'IP base',
    maskLabel: 'Máscara inicial',
    deviceLegend: 'Tipos de dispositivos en esta subred',
    calcBtn: 'Calcular subredes',
    addDevice: 'Añadir tipo de dispositivo',
    calculating: 'Calculando subredes...',
    errorTitle: 'Error en el cálculo',
    retry: 'Intentar de nuevo',
    results: 'Diseño de Subredes por Dispositivo',
    baseNetwork: 'Red Base',
    devices: 'Dispositivos',
    efficiency: 'Eficiencia',
    total: 'total',
    available: 'IPs disponibles',
    general: 'general',
    spaceUsed: 'del espacio usado',
    masksAnalysis: 'Análisis de Máscaras',
    subnetsConfig: 'Configuración de Subredes Consecutivas',
    subnet: 'Subred',
    network: 'Red',
    mask: 'Máscara',
    broadcast: 'Broadcast',
    range: 'Rango',
    needed: 'Necesarios',
    totalSize: 'Tamaño Total',
    sharedMask: 'Máscara compartida',
    subnetsCreated: 'subredes creadas',
    sameNetmask: 'subredes con misma máscara',
    deviceType: 'Tipo (PC, impresora…)',
    quantity: 'Cantidad'
  },
  en: {
    title: 'Logical Network Design Calculator',
    subtitle: 'Little help for Redes',
    ipLabel: 'Base IP',
    maskLabel: 'Initial mask',
    deviceLegend: 'Device types in this subnet',
    calcBtn: 'Calculate subnets',
    addDevice: 'Add device type',
    calculating: 'Calculating subnets...',
    errorTitle: 'Calculation error',
    retry: 'Try again',
    results: 'Subnet Design by Device Type',
    baseNetwork: 'Base Network',
    devices: 'Devices',
    efficiency: 'Efficiency',
    total: 'total',
    available: 'IPs available',
    general: 'general',
    spaceUsed: 'of space used',
    masksAnalysis: 'Netmask Analysis',
    subnetsConfig: 'Consecutive Subnets Configuration',
    subnet: 'Subnet',
    network: 'Network',
    mask: 'Netmask',
    broadcast: 'Broadcast',
    range: 'Range',
    needed: 'Needed',
    totalSize: 'Total Size',
    sharedMask: 'Shared netmask',
    subnetsCreated: 'subnets created',
    sameNetmask: 'subnets with same netmask',
    deviceType: 'Device type (PC, printer…)',
    quantity: 'Quantity'
  }
};

class LanguageManager {
  constructor() {
    this.langToggle = document.getElementById('langToggle');
    this.currentLang = this.detectInitialLang();
    this.calculatorInstance = null; // Para poder actualizar resultados, es para el error que tenái con la subpantalla
    this.applyLang(this.currentLang);

    if (this.langToggle) {
      this.langToggle.checked = this.currentLang === 'en';

      this.langToggle.addEventListener('change', () => {
        const newLang = this.langToggle.checked ? 'en' : 'es';
        this.applyLang(newLang);
        localStorage.setItem('lang', newLang);
        if (this.calculatorInstance && this.calculatorInstance.lastResults) {
          this.calculatorInstance.showSubnetResults(this.calculatorInstance.lastResults);
        }
      });
    }
  }

  setCalculatorInstance(calculator) {
    this.calculatorInstance = calculator;
  }

  detectInitialLang() {
    const saved = localStorage.getItem('lang');
    if (saved) return saved;
    return navigator.language.startsWith('es') ? 'es' : 'en';
  }

  applyLang(lang) {
    this.currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (i18n[lang] && i18n[lang][key]) {
        el.textContent = i18n[lang][key];
      }
    });

    //Pa los placeholders, ya que no todo se puede traducir con texto plano e i18n
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (i18n[lang] && i18n[lang][key]) {
        el.placeholder = i18n[lang][key];
      }
    });
    document.documentElement.setAttribute('lang', lang);
  }

  t(key) {            
    return i18n[this.currentLang][key] ?? `[${key}]`;
  }
}

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
    
    document.body.style.transition = 'all 0.5s ease';
    setTimeout(() => {
      document.body.style.transition = '';
    }, 500);
  }

  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }
}

class CalculadoraSubred {
  constructor(langManager) {
    this.form = document.getElementById('subnetForm');
    this.deviceList = document.getElementById('deviceList');
    this.addDeviceBtn = document.getElementById('addDevice');
    this.resultSection = document.getElementById('result');
    this.lang = langManager;
    this.lastResults = null; // Para poder actualizar resultados cuando cambie idioma
    this.init();
  }

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
        <input type="text" class="dtype" data-i18n-placeholder="deviceType" required />
        <input type="number" class="dqty" data-i18n-placeholder="quantity" min="1" required />
        <button type="button" class="remove-device">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    
    this.deviceList.appendChild(deviceRow);
    
    //traducciones a los nuevos elementos
    this.lang.applyLang(this.lang.currentLang);
    
    this.updateRemoveButtons();
    
    deviceRow.style.opacity = '0';
    deviceRow.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      deviceRow.style.transition = 'all 0.5s ease';
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
        deviceRow.style.transition = 'all 0.5s ease';
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
    this.showLoading();
    setTimeout(() => {
      this.calculate();
    }, 800);
  }

  showLoading() {
    this.resultSection.innerHTML = `
      <div class="loading">
        <i class="fas fa-spinner fa-spin"></i>
        <p>${this.lang.t('calculating')}</p>
      </div>
    `;
  }

  calculate() {
    try {
      const ipStr = document.getElementById('ip').value.trim();
      const maskStr = document.getElementById('mask').value.trim();
      const devices = this.getDevicesData();
      
      if (!ipStr || !maskStr || devices.length === 0) {
        this.showError('Por favor completa todos los campos');
        return;
      }

      const baseCidr = maskStr.startsWith('/') ?
        parseInt(maskStr.slice(1), 10) :
        maskStr.split('.').reduce((c, o) => c + (o === '255' ? 8 : o === '254' ? 7 : o === '252' ? 6 : o === '248' ? 5 : o === '240' ? 4 : o === '224' ? 3 : o === '192' ? 2 : o === '128' ? 1 : 0), 0);

      const subredes = this.calculaSubnets(ipStr, baseCidr, devices);
      
      if (subredes.error) {
        this.showError(subredes.error);
        return;
      }

      this.showSubnetResults({
        ipOriginal: ipStr,
        mascaraOriginal: maskStr,
        baseCidr: baseCidr,
        subredes: subredes
      });

    } catch (error) {
      console.error('Error en el cálculo:', error);
      this.showError('Error en el cálculo. Verifica que la IP y máscara sean válidas.');
    }
  }

  calculaSubnets(baseIp, baseCidr, devices) {
    const baseIpInt = this.ipToInt(baseIp);
    const baseMask = this.cidrToMask(baseCidr);
    const baseNetwork = baseIpInt & baseMask;
    const maxAddressSpace = Math.pow(2, 32 - baseCidr);
    
    let currentAddress = baseNetwork;
    const subredes = [];
    let totalUsedSpace = 0;
    
    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];
      
      const hostsNecesarios = device.quantity + 2;
      const hostBits = Math.ceil(Math.log2(hostsNecesarios));
      const subnetCidr = 32 - hostBits;
      
      if (subnetCidr < baseCidr) {
        return { error: `La subred para "${device.type}" (${device.quantity} hosts) requiere una máscara menor que la red base /${baseCidr}` };
      }
      
      if (subnetCidr > 30) {
        return { error: `La subred para "${device.type}" requiere muy pocos hosts. Mínimo 4 hosts por subred.` };
      }
      
      const subnetMask = this.cidrToMask(subnetCidr);
      const subnetSize = Math.pow(2, hostBits);
      
      if (totalUsedSpace + subnetSize > maxAddressSpace) {
        return { error: `No hay suficiente espacio en la red base /${baseCidr} para todas las subredes. Necesita una máscara menor.` };
      }
      
      const direccionRed = currentAddress;
      const broadcast = direccionRed + subnetSize - 1;
      const firstHost = direccionRed + 1;
      const lastHost = broadcast - 1;
      
      subredes.push({
        tipo: device.type,
        cantidad: device.quantity,
        direccionRed: this.intToIp(direccionRed),
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
      
      currentAddress += subnetSize;
      totalUsedSpace += subnetSize;
    }

    const mascarasUsadas = this.analizarMascaras(subredes);
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
      espacioUtilizado: Math.round((totalUsedSpace / maxAddressSpace) * 100),
      mascarasUsadas
    };
  }

  analizarMascaras(subredes) {
    const mascaras = {};
    
    subredes.forEach(subnet => {
      const key = `/${subnet.cidr}`;
      if (!mascaras[key]) {
        mascaras[key] = {
          cidr: subnet.cidr,
          mascara: subnet.mascara,
          subredes: []
        };
      }
      mascaras[key].subredes.push(subnet.tipo);
    });
    
    return Object.values(mascaras);
  }

  showSubnetResults(data) {
    const mascarasInfo = data.subredes.mascarasUsadas.map(mask => {
      const count = mask.subredes.length;
      const tipos = mask.subredes.join(', ');
      return `
        <div class="mask-info">
          <code class="mask-code">/${mask.cidr}</code>
          <span class="mask-details">${tipos} ${count > 1 ? `(${count} ${this.lang.t('sameNetmask')})` : ''}</span>
        </div>
      `;
    }).join('');

    const subnetCards = data.subredes.subredes.map((subnet, index) => {
      const maskUsage = data.subredes.mascarasUsadas.find(m => m.cidr === subnet.cidr);
      const sharedMask = maskUsage && maskUsage.subredes.length > 1;
      
      return `
        <div class="subnet-card ${this.getSubnetEfficiencyClass(subnet.eficiencia)}">
          <div class="subnet-header">
            <h4>
              <i class="fas fa-sitemap"></i>
              ${this.lang.t('subnet')} ${index + 1}: ${subnet.tipo}
            </h4>
            <div class="efficiency-badge">
              ${subnet.eficiencia}% ${this.lang.t('efficiency')}
            </div>
          </div>
          
          <div class="subnet-details">
            <div class="subnet-row">
              <span class="label"><i class="fas fa-network-wired"></i> ${this.lang.t('network')}:</span>
              <code class="network-addr">${subnet.direccionRed}/${subnet.cidr}</code>
            </div>
            
            <div class="subnet-row">
              <span class="label"><i class="fas fa-shield-alt"></i> ${this.lang.t('mask')}:</span>
              <div class="mask-container">
                <code>${subnet.mascara}</code>
                ${sharedMask ? `<span class="shared-indicator"><i class="fas fa-share-alt"></i> ${this.lang.t('sharedMask')}</span>` : ''}
              </div>
            </div>
            
            <div class="subnet-row">
              <span class="label"><i class="fas fa-broadcast-tower"></i> ${this.lang.t('broadcast')}:</span>
              <code>${subnet.broadcast}</code>
            </div>
            
            <div class="subnet-row range-row">
              <span class="label"><i class="fas fa-arrows-alt-h"></i> ${this.lang.t('range')}:</span>
              <div class="ip-range-inline">
                <code class="ip-start">${subnet.primeraIP}</code>
                <span class="range-separator">→</span>
                <code class="ip-end">${subnet.ultimaIP}</code>
              </div>
            </div>
            
            <div class="subnet-stats">
              <div class="stat">
                <div class="stat-value">${subnet.cantidad}</div>
                <div class="stat-label">${this.lang.t('needed')}</div>
              </div>
              <div class="stat">
                <div class="stat-value">${subnet.hostsDisponibles}</div>
                <div class="stat-label">${this.lang.t('available')}</div>
              </div>
              <div class="stat">
                <div class="stat-value">${subnet.tamaño}</div>
                <div class="stat-label">${this.lang.t('totalSize')}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.resultSection.innerHTML = `
      <div class="results-content">
        <h3><i class="fas fa-project-diagram"></i> ${this.lang.t('results')}</h3>
        
        <div class="summary-stats">
          <div class="summary-card">
            <div class="summary-icon">
              <i class="fas fa-info-circle"></i>
            </div>
            <div class="summary-info">
              <h4>${this.lang.t('baseNetwork')}</h4>
              <p><strong>${data.ipOriginal}${data.mascaraOriginal}</strong></p>
              <small>${data.subredes.subredes.length} ${this.lang.t('subnetsCreated')}</small>
            </div>
          </div>
          
          <div class="summary-card">
            <div class="summary-icon">
              <i class="fas fa-devices"></i>
            </div>
            <div class="summary-info">
              <h4>${this.lang.t('devices')}</h4>
              <p><strong>${data.subredes.totalDevices}</strong> ${this.lang.t('total')}</p>
              <small>${data.subredes.totalHosts} ${this.lang.t('available')}</small>
            </div>
          </div>
          
          <div class="summary-card">
            <div class="summary-icon efficiency-${this.getGeneralEfficiencyClass(data.subredes.eficienciaGeneral)}">
              <i class="fas fa-chart-pie"></i>
            </div>
            <div class="summary-info">
              <h4>${this.lang.t('efficiency')}</h4>
              <p><strong>${data.subredes.eficienciaGeneral}%</strong> ${this.lang.t('general')}</p>
              <small>${data.subredes.espacioUtilizado}% ${this.lang.t('spaceUsed')}</small>
            </div>
          </div>
        </div>

        <div class="masks-analysis">
          <h4><i class="fas fa-layer-group"></i> ${this.lang.t('masksAnalysis')}</h4>
          <div class="masks-grid">
            ${mascarasInfo}
          </div>
        </div>

        <div class="subnets-container">
          <h4><i class="fas fa-list"></i> ${this.lang.t('subnetsConfig')}</h4>
          <div class="subnets-grid">
            ${subnetCards}
          </div>
        </div>
      </div>
    `;
    
    // Guardar los resultados para poder actualizarlos cuando cambie el idioma
    this.lastResults = data;
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
        <h3>${this.lang.t('errorTitle')}</h3>
        <p>${message}</p>
        <button onclick="this.parentElement.parentElement.innerHTML = this.parentElement.parentElement.dataset.placeholder || 'Los resultados aparecerán aquí después del cálculo...'" class="retry-btn">
          <i class="fas fa-redo"></i> ${this.lang.t('retry')}
        </button>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const lang = new LanguageManager();
  new ThemeManager();
  const calculator = new CalculadoraSubred(lang);
  
  // Conectar la instancia de la calculadora con el gestor de idioma
  lang.setCalculatorInstance(calculator);
  
  console.log('🌐 Calculadora de Subredes iniciada correctamente');
});
