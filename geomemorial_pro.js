document.addEventListener("DOMContentLoaded", () => {
    const dadosBrutos = localStorage.getItem("dadosGNSS");
    if (!dadosBrutos) return;
    const dados = JSON.parse(dadosBrutos);

    // 1. DATA E SINCRONIZAÇÃO DA CAPA
    document.getElementById("dataGeracao").innerText = new Date().toLocaleDateString('pt-BR');
    document.getElementById("inputImovel").addEventListener("input", e => document.getElementById("capaImovel").innerText = e.target.value.toUpperCase());
    document.getElementById("inputProp").addEventListener("input", e => document.getElementById("capaProprietario").innerText = "Proprietário: " + e.target.value);
    document.getElementById("inputRT").addEventListener("input", e => document.getElementById("capaRT").innerText = e.target.value);

    // 2. MAPA
    const map = L.map('map', { zoomSnap: 0.1, maxNativeZoom: 19, maxZoom: 22 }).setView([dados[0].lat, dados[0].lon], 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    setTimeout(() => map.invalidateSize(), 500);

    const poly = L.polygon(dados.map(p => [p.lat, p.lon]), {color: 'blue', weight: 3, fillOpacity: 0.15}).addTo(map);

    // 3. TABELAS (LIMPEZA INICIAL)
    const tabAlt = document.querySelector("#tabelaAltimetria tbody");
    const tabConf = document.querySelector("#tabelaConfrontantes tbody");
    const tabQual = document.querySelector("#tabelaQualidade tbody");
    tabAlt.innerHTML = ""; tabConf.innerHTML = ""; tabQual.innerHTML = "";

    dados.forEach((p, i) => {
        L.marker([p.lat, p.lon]).addTo(map).bindTooltip(p.nome, {permanent: true, direction: 'top'});
        const prox = dados[(i + 1) % dados.length];
        const dist = L.latLng(p.lat, p.lon).distanceTo(L.latLng(prox.lat, prox.lon));
        L.marker([(p.lat + prox.lat)/2, (p.lon + prox.lon)/2], { icon: L.divIcon({ className: 'label-pdf', html: dist.toFixed(2) + "m" }) }).addTo(map);

        const latL = p.latDMS.replace(/[^0-9.dm-s-]/g, '');
        const lonL = p.lonDMS.replace(/[^0-9.dm-s-]/g, '');

        tabAlt.innerHTML += `<tr><td>${p.nome}</td><td>${latL}</td><td>${p.lat.toFixed(9)}</td><td>${lonL}</td><td>${p.lon.toFixed(9)}</td><td>${p.elev.toFixed(3)}</td></tr>`;
        tabConf.innerHTML += `<tr><td>${p.nome}</td><td><input type="text" class="conf-input" oninput="gerarTexto()" style="width:95%;"></td></tr>`;
        tabQual.innerHTML += `<tr><td>${p.nome}</td><td>${p.sol}</td><td>${p.hrms}</td><td>${p.vrms}</td></tr>`;
    });

    map.fitBounds(poly.getBounds(), { padding: [40, 40] });
    gerarTexto();
    gerarGrafico(dados);
});

function gerarTexto() {
    const dados = JSON.parse(localStorage.getItem("dadosGNSS"));
    const inputs = document.querySelectorAll(".conf-input");
    let texto = `Inicia-se a descrição no vértice ${dados[0].nome}, Latitude ${dados[0].latDMS.replace(/[^0-9.dm-s-]/g, '')} e Longitude ${dados[0].lonDMS.replace(/[^0-9.dm-s-]/g, '')}. `;
    let p = 0, a = 0;

    dados.forEach((pt, i) => {
        const nx = dados[(i + 1) % dados.length];
        const d = L.latLng(pt.lat, pt.lon).distanceTo(L.latLng(nx.lat, nx.lon)) * 0.9996;
        const az = (Math.atan2(Math.sin((nx.lon-pt.lon)*Math.PI/180)*Math.cos(nx.lat*Math.PI/180), Math.cos(pt.lat*Math.PI/180)*Math.sin(nx.lat*Math.PI/180)-Math.sin(pt.lat*Math.PI/180)*Math.cos(nx.lat*Math.PI/180)*Math.cos((nx.lon-pt.lon)*Math.PI/180))*180/Math.PI+360)%360;
        p += d; a += (pt.lon * nx.lat) - (nx.lon * pt.lat);
        texto += `Deste, segue com confrontante ${inputs[i]?.value || "a designar"}, azimute ${az.toFixed(2)}° e ${d.toFixed(2)}m até o vértice ${nx.nome}. `;
    });

    const areaFinal = Math.abs(a/2) * 111319.9 * (111319.9 * Math.cos(dados[0].lat * Math.PI/180)) * (0.9996**2);
    document.getElementById("printMemorial").innerText = texto + `\n\nÁREA: ${areaFinal.toFixed(2)} m² | PERÍMETRO: ${p.toFixed(2)} m.`;
    document.getElementById("areaFinal").innerText = areaFinal.toFixed(2);
    document.getElementById("periFinal").innerText = p.toFixed(2);
}

function gerarGrafico(dados) {
    new Chart(document.getElementById('graficoRelevo'), {
        type: 'line',
        data: { labels: dados.map(d => d.nome), datasets: [{ label: 'Altitude (m)', data: dados.map(d => d.elev), borderColor: '#2ecc71', fill: true }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function exportarCSV_SIGEF() {
    const dados = JSON.parse(localStorage.getItem("dadosGNSS"));
    let csv = "Vertice;Tipo_Limite;Metodo_Posic;Latitude;Longitude;Altitude;SigmaH;SigmaV\n";
    dados.forEach(p => csv += `${p.nome};P;PG1;${p.lat.toFixed(9)};${p.lon.toFixed(9)};${p.elev.toFixed(3)};${p.hrms};${p.vrms}\n`);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = "sigef_export.csv"; link.click();
}