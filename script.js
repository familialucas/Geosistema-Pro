let mapa = L.map('map').setView([-12.5206, -40.2767], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 22 }).addTo(mapa);

let pontosImportados = [];
let camadaMarcadores = L.layerGroup().addTo(mapa);
let camadaPoligono = null;
let camadaLabels = L.layerGroup().addTo(mapa);

function converterDMS(coord) {
    if (!coord) return null;
    let p = coord.match(/(-?\d+)d(\d+)m([\d\.]+)s/);
    if (!p) return parseFloat(coord.replace(',', '.'));
    let g = parseFloat(p[1]), m = parseFloat(p[2]), s = parseFloat(p[3]);
    let dec = Math.abs(g) + (m / 60) + (s / 3600);
    return g < 0 ? dec * -1 : dec;
}

function importarDados() {
    let file = document.getElementById("arquivoGNSS").files[0];
    if (!file) return alert("Selecione o arquivo.");
    let reader = new FileReader();
    reader.onload = function(e) {
        let doc = new DOMParser().parseFromString(e.target.result, "text/html");
        let linhas = doc.querySelectorAll("table")[2]?.rows || doc.querySelectorAll("tr");
        pontosImportados = [];
        camadaMarcadores.clearLayers();
        document.getElementById("corpoTabela").innerHTML = "";

        for (let i = 1; i < linhas.length; i++) {
            let c = linhas[i].cells;
            if (c.length >= 31) {
                let nome = c[1].innerText.trim();
                let lat = converterDMS(c[7].innerText);
                let lon = converterDMS(c[8].innerText);
                let elev = parseFloat(c[6].innerText.replace(',', '.')); // Altimetria 
                let hrms = c[31].innerText;
                let vrms = c[32]?.innerText || "0.000";
                let sol = c[25].innerText; // Solução 

                if (!isNaN(lat)) {
                    let p = { nome, lat, lon, elev, hrms, vrms, sol, latDMS: c[7].innerText, lonDMS: c[8].innerText };
                    pontosImportados.push(p);
                    L.marker([lat, lon]).addTo(camadaMarcadores).bindPopup(nome);
                    
                    let isDivisa = nome.toLowerCase().includes("marco") || !isNaN(nome);
                    document.getElementById("corpoTabela").innerHTML += `<tr>
                        <td><input type="checkbox" class="checkPonto" data-idx="${pontosImportados.length-1}" ${isDivisa ? 'checked' : ''}></td>
                        <td>${nome}</td><td>${c[7].innerText}</td><td>${c[8].innerText}</td>
                        <td>${elev.toFixed(3)}</td><td>${hrms}</td><td>${sol}</td>
                    </tr>`;
                }
            }
        }
        if (pontosImportados.length) mapa.fitBounds(camadaMarcadores.getBounds());
    };
    reader.readAsText(file);
}

function selecionarTodos(source) {
    document.querySelectorAll('.checkPonto').forEach(c => c.checked = source.checked);
}

function gerarPoligonal() {
    if (camadaPoligono) mapa.removeLayer(camadaPoligono);
    camadaLabels.clearLayers();
    let sel = [];
    document.querySelectorAll(".checkPonto:checked").forEach(c => {
        sel.push(pontosImportados[c.dataset.idx]);
    });
    if (sel.length < 3) return alert("Selecione 3+ pontos.");
    let coords = sel.map(p => [p.lat, p.lon]);
    camadaPoligono = L.polygon(coords, {color: 'red'}).addTo(mapa);
    sel.forEach((p, i) => {
        let prox = sel[(i + 1) % sel.length];
        let d = L.latLng(p.lat, p.lon).distanceTo(L.latLng(prox.lat, prox.lon));
        let meio = [(p.lat + prox.lat)/2, (p.lon + prox.lon)/2];
        L.marker(meio, { icon: L.divIcon({ className: 'label-medida', html: d.toFixed(2) + "m" }) }).addTo(camadaLabels);
    });
    
    let area = 0, per = 0;
    for (let i = 0; i < sel.length; i++) {
        let p1 = sel[i], p2 = sel[(i+1)%sel.length];
        per += L.latLng(p1.lat, p1.lon).distanceTo(L.latLng(p2.lat, p2.lon));
        area += (p1.lon * p2.lat) - (p2.lon * p1.lat);
    }
    area = Math.abs(area / 2) * 111319.9 * (111319.9 * Math.cos(sel[0].lat * Math.PI / 180));
    document.getElementById("area").innerText = area.toFixed(2);
    document.getElementById("perimetro").innerText = per.toFixed(2);
    mapa.fitBounds(camadaPoligono.getBounds());
}

/* script.js - Ajuste na função de envio */
function enviarParaMemorial() {
    let lista = [];
    document.querySelectorAll(".checkPonto:checked").forEach(c => {
        let p = pontosImportados[c.dataset.idx];
        p.fatorK = 0.9996; // Valor extraído do seu relatório ItabeOriginal
        lista.push(p);
    });
    if (lista.length < 3) return alert("Selecione a poligonal.");
    localStorage.setItem("dadosGNSS", JSON.stringify(lista));
    window.location.href = "geodescritivo_pro.html";
}