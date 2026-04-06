/* ======================
VARIÁVEIS
====================== */

let map
let vertices=[]
let markers=[]
let poligono=null
let labelsDistancia=[]

/* ======================
INICIAR MAPA
====================== */

window.onload=function(){

map=L.map('map').setView([-12.6898,-38.3826],18)

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
maxZoom:22
}).addTo(map)

map.on("click",adicionarVertice)

}

/* ======================
ADICIONAR VÉRTICE
====================== */

function adicionarVertice(e){

let lat=e.latlng.lat
let lon=e.latlng.lng

let vertice={
id:"V"+(vertices.length+1),
lat:lat,
lon:lon
}

vertices.push(vertice)

let marker=L.marker([lat,lon],{
draggable:true,
icon:L.divIcon({
className:'verticeIcon',
html:vertice.id
})
}).addTo(map)

markers.push(marker)

/* mover vértice */

marker.on("drag",function(e){

let pos=e.target.getLatLng()

vertices.forEach(v=>{

if(v.id===vertice.id){
v.lat=pos.lat
v.lon=pos.lng
}

})


desenharPoligono()
atualizarTabela()
atualizarTabelaVertices()
atualizarTabelaLados()

})


atualizarTabela()

}

/* ======================
DESENHAR POLÍGONO
====================== */

function desenharPoligono(){

if(poligono){
map.removeLayer(poligono)
}

/* remover rótulos antigos */

labelsDistancia.forEach(l=>{
map.removeLayer(l)
})

labelsDistancia=[]

if(vertices.length<3) return

let coords=[]

vertices.forEach(v=>{
coords.push([v.lat,v.lon])
})

poligono=L.polygon(coords,{color:'yellow'}).addTo(map)

map.fitBounds(poligono.getBounds())

/* calcular distâncias */

for(let i=0;i<vertices.length;i++){

let j=(i+1)%vertices.length

let p1=L.latLng(vertices[i].lat,vertices[i].lon)
let p2=L.latLng(vertices[j].lat,vertices[j].lon)

let dist=p1.distanceTo(p2)

let lat=(vertices[i].lat+vertices[j].lat)/2
let lon=(vertices[i].lon+vertices[j].lon)/2

let label=L.marker([lat,lon],{
icon:L.divIcon({
className:'distanciaLabel',
html:dist.toFixed(2)+" m"
})
}).addTo(map)

labelsDistancia.push(label)

}

calcularArea(coords)

}


/* ======================
ATUALIZAR TABELA
====================== */

function atualizarTabela(){

let tbody=document.querySelector("#tabelaPontos tbody")

tbody.innerHTML=""

vertices.forEach((v,i)=>{

let linha=`
<tr>
<td><input type="checkbox" data-id="${i}"></td>
<td>${v.id}</td>
<td>${v.lat.toFixed(8)}</td>
<td>${v.lon.toFixed(8)}</td>
</tr>
`

tbody.innerHTML+=linha

})

}

/* ======================
CRIAR POLIGONAL
====================== */

function criarPoligonal(){

let selecionados=[]

document.querySelectorAll("#tabelaPontos input:checked").forEach(c=>{

selecionados.push(vertices[c.dataset.id])

})

if(selecionados.length<3){
alert("Selecione pelo menos 3 pontos.")
return
}

/* limpar mapa */

markers.forEach(m=>{
map.removeLayer(m)
})

markers=[]

/* atualizar lista de vértices */

vertices=selecionados

/* recriar marcadores */

vertices.forEach(v=>{

let marker=L.marker([v.lat,v.lon],{
draggable:true,
icon:L.divIcon({
className:'verticeIcon',
html:v.id
})
}).addTo(map)

markers.push(marker)

})

/* desenhar poligonal */

desenharPoligono()

/* atualizar tabelas */

atualizarTabelaVertices()

atualizarTabelaLados()

}



/* ======================
CALCULAR AZIMUTE
====================== */

function calcularAzimute(lat1,lon1,lat2,lon2){

let φ1=lat1*Math.PI/180
let φ2=lat2*Math.PI/180
let Δλ=(lon2-lon1)*Math.PI/180

let y=Math.sin(Δλ)*Math.cos(φ2)
let x=Math.cos(φ1)*Math.sin(φ2)-
Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ)

let az=Math.atan2(y,x)*180/Math.PI

az=(az+360)%360

return az

}



/* ======================
CALCULAR ÁREA
====================== */

function calcularArea(coords){

let area=0
let per=0

for(let i=0;i<coords.length;i++){

let j=(i+1)%coords.length

let p1=L.latLng(coords[i][0],coords[i][1])
let p2=L.latLng(coords[j][0],coords[j][1])

per+=p1.distanceTo(p2)

let x1=coords[i][1]
let y1=coords[i][0]

let x2=coords[j][1]
let y2=coords[j][0]

area+=(x1*y2-x2*y1)

}

area=Math.abs(area/2)*111139*111139

document.getElementById("area").innerText=area.toFixed(2)
document.getElementById("perimetro").innerText=per.toFixed(2)

}

/* ======================
LIMPAR POLIGONAL
====================== */

function limparPoligonal(){

vertices=[]

markers.forEach(m=>{
map.removeLayer(m)
})

markers=[]

if(poligono){
map.removeLayer(poligono)
}

document.querySelector("#tabelaPontos tbody").innerHTML=""

document.getElementById("area").innerText="0"
document.getElementById("perimetro").innerText="0"

}

/* ======================
GERAR MEMORIAL
====================== */

function gerarMemorial(){

if(vertices.length<3){
alert("Crie uma poligonal primeiro.")
return
}

let texto="MEMORIAL DESCRITIVO\n\n"

vertices.forEach((v,i)=>{

let prox=vertices[(i+1)%vertices.length]

let p1=L.latLng(v.lat,v.lon)
let p2=L.latLng(prox.lat,prox.lon)

let dist=p1.distanceTo(p2).toFixed(2)

let az=calcularAzimute(v.lat,v.lon,prox.lat,prox.lon).toFixed(2)

texto+=`Do vértice ${v.id} (${v.lat.toFixed(8)}, ${v.lon.toFixed(8)}) segue com azimute ${az}° e distância ${dist} metros até o vértice ${prox.id}\n\n`

})

document.getElementById("memorial").value=texto

}

/* ======================
EXPORTAR KML
====================== */

function exportarKML(){

if(vertices.length<3){
alert("Crie uma poligonal.")
return
}

let kml=`<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
<Placemark>
<Polygon>
<outerBoundaryIs>
<LinearRing>
<coordinates>
`

vertices.forEach(v=>{
kml+=`${v.lon},${v.lat},0 `
})

kml+=`${vertices[0].lon},${vertices[0].lat},0`

kml+=`
</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
</Document>
</kml>
`

let blob=new Blob([kml],{type:"application/vnd.google-earth.kml+xml"})

let a=document.createElement("a")

a.href=URL.createObjectURL(blob)
a.download="poligonal.kml"
a.click()

}

/* ======================
CONVERTER DMS PARA DECIMAL
====================== */

function converterDMS(coord){

let r=/(-?\d+)d(\d+)m([\d\.]+)s/

let p=coord.match(r)

if(!p) return null

let g=parseFloat(p[1])
let m=parseFloat(p[2])
let s=parseFloat(p[3])

let dec=Math.abs(g)+(m/60)+(s/3600)

if(g<0) dec*=-1

return dec

}

/* ======================
IMPORTAR HTML GNSS
====================== */

function lerArquivo(){

const file=document.getElementById("arquivo").files[0]

if(!file){
alert("Selecione o arquivo GNSS primeiro.")
return
}

const reader=new FileReader()

reader.onload=function(e){

const parser=new DOMParser()

const doc=parser.parseFromString(e.target.result,"text/html")

const linhas=doc.querySelectorAll("table")[2].rows

let grupo=[]

for(let i=1;i<linhas.length;i++){

let c=linhas[i].cells

let lat=converterDMS(c[7].innerText)
let lon=converterDMS(c[8].innerText)

if(lat && lon){

let vertice={
id:c[1].innerText,
lat:lat,
lon:lon
}

vertices.push(vertice)

let marker=L.marker([lat,lon],{
draggable:true,
icon:L.divIcon({
className:'verticeIcon',
html:vertice.id
})
}).addTo(map)

markers.push(marker)

grupo.push([lat,lon])

}

}

if(grupo.length>0){
map.fitBounds(grupo)
}

atualizarTabela()

}

reader.readAsText(file)

}