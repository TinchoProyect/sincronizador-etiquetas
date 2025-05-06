import { modal } from './modal.js';

class PrintManager {
  constructor() {
    this.initializeElements();
    this.setupEventListeners();
    this.articulos = [];
    this.articuloSeleccionado = null;
    this.cargarArticulos();
  }

  initializeElements() {
    // Elementos de búsqueda
    this.searchInput = document.getElementById('search');
    this.barcodeInput = document.getElementById('barcodeInput');
    
    // Elementos de la tabla
    this.articulosTableBody = document.querySelector('#articulosTable tbody');
    
    // Elementos de fechas
    this.incluirFechasCheck = document.getElementById('incluirFechas');
    this.fechasGroup = document.getElementById('fechasGroup');
    this.fechaElaboracionInput = document.getElementById('fechaElaboracion');
    this.fechaVencimientoInput = document.getElementById('fechaVencimiento');
    
    // Elementos de impresión
    this.cantidadInput = document.getElementById('cantidad');
    this.printBtn = document.getElementById('printBtn');
    
    // Elementos de etiqueta personalizada
    this.textoPrincipalInput = document.getElementById('textoPrincipal');
    this.textoSecundarioInput = document.getElementById('textoSecundario');
    this.textoAdicionalInput = document.getElementById('textoAdicional');
    this.cantidadPersonalizadaInput = document.getElementById('cantidadPersonalizada');
    this.printBtnPersonalizado = document.getElementById('printBtnPersonalizado');

    // Pestañas
    this.tabButtons = document.querySelectorAll('.tab-button');
    this.tabContents = document.querySelectorAll('.tab-content');
  }

  setupEventListeners() {
    // Eventos de búsqueda
    this.searchInput.addEventListener('input', () => this.filtrarArticulos());
    this.barcodeInput.addEventListener('change', () => this.manejarEscaneo());
    
    // Eventos de impresión
    this.printBtn.addEventListener('click', () => this.imprimir());
    this.printBtnPersonalizado.addEventListener('click', () => this.imprimirEtiquetaPersonalizada());
    
    // Evento de fechas
    this.incluirFechasCheck.addEventListener('change', () => {
      this.fechasGroup.style.display = this.incluirFechasCheck.checked ? 'block' : 'none';
      if (this.incluirFechasCheck.checked) {
        this.inicializarFechas();
      }
    });

    // Manejo de pestañas
    this.tabButtons.forEach(button => {
      button.addEventListener('click', () => this.cambiarPestana(button));
    });
  }

  async cargarArticulos() {
    try {
      const res = await fetch('/api/articulos');
      this.articulos = await res.json();
      this.mostrarArticulos(this.articulos);
    } catch (error) {
      console.error('Error al cargar artículos:', error);
    }
  }

  mostrarArticulos(lista) {
    this.articulosTableBody.innerHTML = '';
    lista.forEach(art => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${art.numero}</td>
        <td>${art.nombre}</td>
        <td>${art.codigo_barras}</td>
      `;
      tr.addEventListener('click', () => this.seleccionarArticulo(art));
      this.articulosTableBody.appendChild(tr);
    });
  }

  filtrarArticulos() {
    const texto = this.searchInput.value.toLowerCase();
    const filtrados = this.articulos.filter(art =>
      art.numero.toLowerCase().includes(texto) ||
      art.nombre.toLowerCase().includes(texto)
    );
    this.mostrarArticulos(filtrados);
  }

  seleccionarArticulo(art) {
    this.articuloSeleccionado = art;
    modal.updatePreview(art);
    modal.open();
  }

  manejarEscaneo() {
    const codigo = this.barcodeInput.value.trim();
    if (!codigo) return;
    
    const encontrado = this.articulos.find(art => art.codigo_barras === codigo);
    if (encontrado) {
      this.seleccionarArticulo(encontrado);
      this.barcodeInput.value = '';
    }
  }

  cambiarPestana(selectedButton) {
    this.tabButtons.forEach(button => button.classList.remove('active'));
    this.tabContents.forEach(content => content.classList.remove('active'));
    
    selectedButton.classList.add('active');
    const tabId = selectedButton.getAttribute('data-tab');
    document.getElementById(tabId).classList.add('active');
  }

  redondearPar(num) {
    const n = parseInt(num, 10);
    if (isNaN(n) || n < 2) return 2;
    return n % 2 === 0 ? n : n + 1;
  }

  formatearFecha(fecha) {
    const d = fecha ? new Date(fecha) : new Date();
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const año = d.getFullYear();
    return `${dia}/${mes}/${año}`;
  }

  calcularFechaVencimiento() {
    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() + 8);
    return fecha.toISOString().split('T')[0];
  }

  inicializarFechas() {
    this.fechaElaboracionInput.value = this.formatearFecha();
    this.fechaVencimientoInput.value = this.calcularFechaVencimiento();
  }

  async imprimir() {
    if (!this.articuloSeleccionado) {
      alert('Seleccione un artículo para imprimir.');
      return;
    }

    const cantidad = this.redondearPar(this.cantidadInput.value);
    let datosImpresion = {
      ...this.articuloSeleccionado
    };

    if (this.incluirFechasCheck.checked) {
      datosImpresion = {
        ...datosImpresion,
        fechas: {
          elaboracion: this.formatearFecha(),
          vencimiento: this.formatearFecha(this.fechaVencimientoInput.value)
        }
      };
    }

    try {
      const res = await fetch('/api/imprimir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...datosImpresion,
          cantidad
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        modal.close();
      } else {
        alert('Error al imprimir: ' + data.error);
      }
    } catch (error) {
      alert('Error al imprimir: ' + error.message);
    }
  }

  async imprimirEtiquetaPersonalizada() {
    const textoPrincipal = this.textoPrincipalInput.value.trim();
    if (!textoPrincipal) {
      alert('El texto principal es obligatorio.');
      return;
    }

    const datos = {
      textoPrincipal,
      textoSecundario: this.textoSecundarioInput.value.trim(),
      textoAdicional: this.textoAdicionalInput.value.trim()
    };

    const cantidad = parseInt(this.cantidadPersonalizadaInput.value, 10);

    try {
      const res = await fetch('/api/imprimir-personalizada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos, cantidad }),
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
      } else {
        alert('Error al imprimir: ' + data.error);
      }
    } catch (error) {
      alert('Error al imprimir: ' + error.message);
    }
  }
}

// Inicializar el gestor de impresión cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new PrintManager();
});
