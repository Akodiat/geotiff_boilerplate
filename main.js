// Setup gui
let gui = new dat.GUI({autoPlace: false});
document.getElementById("guiContainer").appendChild(gui.domElement);

let settings = {
    min: 0,
    max: 1,
    opacity: 0.7
}
let minController = gui.add(settings, "min", settings.min, settings.max);
let maxController = gui.add(settings, "max", settings.min, settings.max);
let opacityController = gui.add(settings, "opacity", 0, 1);

// initalize leaflet map
let map = L.map('map').setView([0, 0], 5);

map.createPane('labels');
map.getPane('labels').style.zIndex = 650;
map.getPane('labels').style.pointerEvents = 'none';

const positron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
    attribution: '©OpenStreetMap, ©CartoDB'
}).addTo(map);

const positronLabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
    attribution: '©OpenStreetMap, ©CartoDB',
    pane: 'labels'
}).addTo(map);

//let overlays = {};
//overlays[file.name] = layer;
const layerControl = L.control.layers(undefined, undefined, {position: 'topleft'}).addTo(map);

const layers = [];

document.getElementById("geotiff-file").addEventListener("change", function(event) {
    for (const file of event.target.files) {
        console.log("file:", file);

        let reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onloadend = function() {
            let arrayBuffer = reader.result;
            parseGeoraster(arrayBuffer).then(georaster => {
                console.log("georaster:", georaster);

                // TODO, think this through
                if (georaster.numberOfRasters === 1) {
                    settings.min = Math.min(settings.min, Math.max(0,georaster.mins[0]));
                    settings.max = Math.max(settings.max, georaster.maxs[0]);

                    minController.min(Math.min(settings.min, georaster.mins[0]));
                    maxController.max(Math.max(settings.max, georaster.maxs[0]));
                    maxController.min(Math.min(settings.min, georaster.mins[0]));
                    minController.max(Math.max(settings.max, georaster.maxs[0]));
                    minController.updateDisplay();
                    maxController.updateDisplay();
                }

                let scale = chroma.scale("Viridis");

                let layer = new GeoRasterLayer({
                    georaster: georaster,
                    opacity: settings.opacity,
                    pixelValuesToColorFn: georaster.numberOfRasters === 1 ? pixelValues => {
                        let pixelValue = pixelValues[0]; // assume there's just one band in this raster
                        // scale to 0 - 1 used by chroma
                        let scaledPixelValue = (pixelValue - settings.min) / (settings.max - settings.min);
                        let color = scale(scaledPixelValue).hex();
                        return color;
                    } : null,
                    resolution: 256
                });
                console.log("layer:", layer);
                layer.addTo(map);
                layers.push(layer);

                layerControl.addOverlay(layer, file.name);

                map.fitBounds(layer.getBounds());
                document.getElementById("overlay").style.display = "none";

                maxController.onChange(() => layers.forEach(l=>l.redraw()));
                minController.onChange(() => layers.forEach(l=>l.redraw()));
                opacityController.onChange(() => layers.forEach(l=>l.setOpacity(settings.opacity)));
            });
        };
    }
});