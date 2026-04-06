// ===== Sistema de Poligonal - JS Principal =====
// Requer: Leaflet.js

let map;
let pontos = [];
let marcadores = [];
let linhas = [];
let labelsDistancia = [];
let poligono = null;




if(dados){

let verts = JSON.parse(dados)

verts.forEach(p=>{

let marker=L.marker([p.lat,p.lon]).addTo(map)

pontos.push([p.lat,p.lon])

})

atualizarLinhas()
atualizarPoligono()

}





function iniciarMapa(){
    map = L.map('map').setView([-15.78,-47.93],18);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:22
    }).addTo(map);

    map.on('click', adicionarPonto);
}

function adicionarPonto(e){

    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    pontos.push([lat,lng]);

    atualizarTabela();

    const marcador = L.marker([lat,lng]).addTo(map);
    marcadores.push(marcador);

    atualizarLinhas();
    atualizarPoligono();
}

function desfazerUltimo(){

    if(pontos.length === 0) return;

    pontos.pop();

    const marcador = marcadores.pop();
    map.removeLayer(marcador);

    atualizarLinhas();
    atualizarPoligono();
}

function limparLinhas(){

    linhas.forEach(l=>map.removeLayer(l));
    labelsDistancia.forEach(l=>map.removeLayer(l));

    linhas=[];
    labelsDistancia=[];
}

function atualizarLinhas(){

    limparLinhas();

    for(let i=1;i<pontos.length;i++){

        const p1 = pontos[i-1];
        const p2 = pontos[i];

        const linha = L.polyline([p1,p2],{color:'red'}).addTo(map);
        linhas.push(linha);

        const dist = calcularDistancia(p1,p2);

        const meioLat = (p1[0]+p2[0])/2;
        const meioLng = (p1[1]+p2[1])/2;

        const label = L.tooltip({
            permanent:true,
            direction:'center',
            className:'distancia-label'
        })
        .setLatLng([meioLat,meioLng])
        .setContent(dist.toFixed(2)+' m')
        .addTo(map);

        labelsDistancia.push(label);
    }
}

function atualizarPoligono(){

    if(poligono) map.removeLayer(poligono);

    if(pontos.length >=3){

        poligono = L.polygon(pontos,{color:'blue',fillOpacity:0.1}).addTo(map);

        const area = calcularArea(pontos);

        document.getElementById('area').innerText = area.toFixed(2)+' m²';
    }
}

// Distância Haversine
function calcularDistancia(p1,p2){

    const R = 6371000;

    const lat1 = p1[0]*Math.PI/180;
    const lat2 = p2[0]*Math.PI/180;

    const dLat = (p2[0]-p1[0])*Math.PI/180;
    const dLng = (p2[1]-p1[1])*Math.PI/180;

    const a = Math.sin(dLat/2)*Math.sin(dLat/2)+
        Math.cos(lat1)*Math.cos(lat2)*
        Math.sin(dLng/2)*Math.sin(dLng/2);

    const c = 2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));

    return R*c;
}

// Área usando Leaflet Geometry
function calcularArea(coords){

    let area = 0;

    for(let i=0;i<coords.length;i++){

        const j = (i+1)%coords.length;

        const xi = coords[i][1];
        const yi = coords[i][0];

        const xj = coords[j][1];
        const yj = coords[j][0];

        area += (xi*yj - xj*yi);
    }

    area = Math.abs(area/2);

    // conversão aproximada graus->m²
    return area*12365000000;
}

// Exportação KML
function exportarKML(){

    if(pontos.length <3) return;

    let coords='';

    pontos.forEach(p=>{
        coords += p[1]+','+p[0]+',0 ';
    });

    const kml = `
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
<Placemark>
<Polygon>
<outerBoundaryIs>
<LinearRing>
<coordinates>
${coords}
</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
</Document>
</kml>`;

    const blob = new Blob([kml],{type:'application/vnd.google-earth.kml+xml'});

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'poligono.kml';
    a.click();
}

window.onload = iniciarMapa;


// Função de AZIMUTE

function calcularAzimute(p1, p2){

const lat1 = p1[0] * Math.PI/180;
const lat2 = p2[0] * Math.PI/180;

const dLon = (p2[1]-p1[1]) * Math.PI/180;

const y = Math.sin(dLon) * Math.cos(lat2);
const x =
Math.cos(lat1)*Math.sin(lat2) -
Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);

let brng = Math.atan2(y,x);

brng = brng * 180/Math.PI;

return (brng + 360) % 360;
}

// de atualização da TABELA

function atualizarTabela(){

const tbody = document.querySelector("#tabelaVertices tbody");

tbody.innerHTML = "";

for(let i=0;i<pontos.length;i++){

const lat = pontos[i][0];
const lon = pontos[i][1];

let dist = "";
let az = "";

if(i>0){

dist = calcularDistancia(pontos[i-1], pontos[i]).toFixed(2);

az = calcularAzimute(pontos[i-1], pontos[i]).toFixed(2);

}

const linha = `
<tr>
<td>P${i+1}</td>
<td>${lat.toFixed(6)}</td>
<td>${lon.toFixed(6)}</td>
<td>${dist}</td>
<td>${az}</td>
</tr>
`;

tbody.innerHTML += linha;

}

}

