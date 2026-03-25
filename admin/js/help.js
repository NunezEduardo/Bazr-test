/**
 * MVP Admin — Help Modal (admin/js/help.js)
 * ==========================================
 * Renders the command reference in the help modal.
 */
'use strict';

const AdminHelp = (() => {

    const SECTIONS = [
        {
            title: '📦 Productos',
            commands: [
                { cmd: 'listar',              desc: 'Lista todos los productos', example: 'listar' },
                { cmd: 'listar [colección]',  desc: 'Filtra por colección', example: 'listar Camisas' },
                { cmd: 'agregar nombre="..." precio=XX coleccion="..."', desc: 'Agrega un producto', example: 'agregar nombre="Camisa Lino" precio=49.99 coleccion="Camisas"' },
                { cmd: 'editar id=XXX campo=valor',  desc: 'Edita un campo de un producto', example: 'editar id=prod-001 precio=39.99' },
                { cmd: 'eliminar id=XXX',     desc: 'Elimina un producto', example: 'eliminar id=prod-001' },
                { cmd: 'destacar id=XXX',     desc: 'Marca producto como destacado', example: 'destacar id=prod-001' },
                { cmd: 'agregar-imagen id=XXX', desc: 'Sube imagen WebP para un producto', example: 'agregar-imagen id=prod-001' },
                { cmd: 'exportar productos',  desc: 'Descarga products.json', example: 'exportar productos' },
            ]
        },
        {
            title: '🗂️ Colecciones',
            commands: [
                { cmd: 'listar-categorias',   desc: 'Lista las colecciones', example: 'listar-categorias' },
                { cmd: 'agregar-categoria nombre="..."', desc: 'Agrega una colección', example: 'agregar-categoria nombre="Accesorios"' },
                { cmd: 'eliminar-categoria id=XXX', desc: 'Elimina una colección', example: 'eliminar-categoria id=cat-001' },
            ]
        },
        {
            title: '📬 Pedidos',
            commands: [
                { cmd: 'ver-pedidos',          desc: 'Lista todos los pedidos', example: 'ver-pedidos' },
                { cmd: 'ver-pedidos estado=pendiente', desc: 'Filtra por estado', example: 'ver-pedidos estado=confirmado' },
                { cmd: 'aprobar-pedido id=XXX', desc: 'Confirma un pedido', example: 'aprobar-pedido id=ORD-001' },
                { cmd: 'estado-pedido id=XXX estado=enviado', desc: 'Cambia estado de pedido', example: 'estado-pedido id=ORD-001 estado=enviado' },
                { cmd: 'limpiar-pedidos',      desc: 'Elimina todos los pedidos', example: 'limpiar-pedidos' },
            ]
        },
        {
            title: '💳 Pagos',
            commands: [
                { cmd: 'listar-pagos',         desc: 'Lista métodos de pago', example: 'listar-pagos' },
                { cmd: 'agregar-pago nombre="..." instrucciones="..."', desc: 'Agrega método de pago', example: 'agregar-pago nombre="Binance" instrucciones="Enviar a..."' },
                { cmd: 'eliminar-pago id=XXX', desc: 'Elimina un método de pago', example: 'eliminar-pago id=pay-001' },
            ]
        },
        {
            title: '⚙️ Configuración',
            commands: [
                { cmd: 'config campo=valor',     desc: 'Actualiza un campo de configuración', example: 'config storeName="Mi Tienda"' },
                { cmd: 'config-color primario=#HEX', desc: 'Cambia el color primario', example: 'config-color primario=#ff6b35' },
                { cmd: 'config-logo',            desc: 'Sube el logo de la tienda', example: 'config-logo' },
                { cmd: 'ver-config',             desc: 'Muestra la configuración actual', example: 'ver-config' },
            ]
        },
        {
            title: '📊 Dashboard',
            commands: [
                { cmd: 'estado',       desc: 'Muestra estadísticas de la tienda', example: 'estado' },
                { cmd: 'ayuda / help', desc: 'Muestra esta ayuda', example: 'ayuda' },
                { cmd: 'salir',        desc: 'Cierra la sesión', example: 'salir' },
            ]
        },
    ];

    function init() {
        const openBtn  = document.getElementById('help-btn');
        const closeBtn = document.getElementById('help-close');
        const overlay  = document.getElementById('help-overlay');
        const body     = document.getElementById('help-body');

        if (body) body.innerHTML = _render();

        openBtn?.addEventListener('click',  () => overlay?.classList.add('show'));
        closeBtn?.addEventListener('click', () => overlay?.classList.remove('show'));
        overlay?.addEventListener('click', e => {
            if (e.target === overlay) overlay.classList.remove('show');
        });
    }

    function _render() {
        return SECTIONS.map(section => `
            <div class="help-section">
              <h3 class="help-section-title">${section.title}</h3>
              <div class="help-commands">
                ${section.commands.map(c => `
                  <div class="help-command">
                    <code class="help-cmd">${MvpUtils.escapeHtml(c.cmd)}</code>
                    <span class="help-desc">${MvpUtils.escapeHtml(c.desc)}</span>
                    <button class="help-use-btn" data-cmd="${MvpUtils.escapeHtml(c.example)}" title="Usar este comando">
                      ▶ Usar
                    </button>
                  </div>`).join('')}
              </div>
            </div>`
        ).join('');
    }

    function bindInsert(onInsert) {
        document.getElementById('help-body')?.addEventListener('click', e => {
            const btn = e.target.closest('.help-use-btn');
            if (!btn) return;
            const overlay = document.getElementById('help-overlay');
            overlay?.classList.remove('show');
            onInsert(btn.dataset.cmd);
        });
    }

    return { init, bindInsert };
})();

window.AdminHelp = AdminHelp;
