import { Map } from 'ol';
import WebGLTileLayer from 'ol/layer/WebGLTile';
import OSM from 'ol/source/OSM';
import MapView from 'ol/View';
import WKT from 'ol/format/WKT';
import VectorLayerWGL from 'ol/layer/WebGLVector';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';

/**
 * @typedef {Feature<import('ol/geom/Polygon').default>} PolyFeature
 * @typedef {import('ol/style/flat').FlatStyleLike} FlatStyleLike
 */

/**
 * @type {PolyFeature}
 */
let hoveredFeature = null;
/**
 * @type {PolyFeature}
 */
let selectedFeature = null;

const stroke_width = 1;
const stroke_width_selected = 5;

const stroke_color = 'rgba(0, 0, 255, 0.6)';
const stroke_color_hover = 'rgba(0, 0, 255, 0.6)';
const stroke_color_selected = 'rgba(220, 85, 85, 1)';

const fill_color = 'rgba(40, 40, 40, 0.1)';
const fill_color_hover = 'rgba(40, 40, 40, 0.42)';
const fill_color_selected = 'rgba(220, 85, 85, 0.2)';

const HOVER_NONE = 0;
const HOVER_HOVERED = 1;
const HOVER_SELECTED = 2;

/**
 * @type {FlatStyleLike}
 */
const common = {
    'stroke-width': [
        'match', //
        ['get', 'hover'],
        HOVER_SELECTED, // case selected
        stroke_width_selected, // selected value
        stroke_width, // default value (else)
                      // this one breaks when layer is 'ol/layer/Vector', compileCaseExpression "out of range (i+1)"
                      // see https://github.com/openlayers/openlayers/blob/main/src/ol/expr/cpu.js#L485
    ],
    'stroke-color': [
        'match',
        ['get', 'hover'],
        HOVER_SELECTED, // case selected
        stroke_color_selected, // selected value
        HOVER_HOVERED, // state hovered (ifelse)
        stroke_color_hover, // hovered value
        stroke_color, // default value (else)
    ],
    'fill-color': [
        'match',
        ['get', 'hover'],
        HOVER_SELECTED, // case selected
        fill_color_selected, // selected value
        HOVER_HOVERED, // state hovered (ifelse)
        fill_color_hover, // hovered value
        fill_color, // default value (else)
    ],
};

/**
 * @type {FlatStyleLike}
 */
const styleFilter = [
    {
        filter: ['match', ['get', 'internalType'], 'type2', true, false],
        style: common,
    },
];

/**
 * @type {FlatStyleLike}
 */
const styleCommon = [common];

const source = getSource();

let layer = new VectorLayerWGL({
    style: styleCommon,
    source,
});

const elemFilter = /**@type {HTMLInputElement}*/ (document.getElementById('filter'));
elemFilter.addEventListener('input', e => {
    const style = e.currentTarget.checked ? styleFilter : styleCommon;
    layer.setStyle(style);
});
elemFilter.checked = false;

const map = new Map({
    target: 'map',
    view: new MapView({
        maxZoom: 18,
    }),
    layers: [
        new WebGLTileLayer({
            source: new OSM(),
        }),
        layer,
    ],
});

map.getView().fit(source.getExtent(), {
    padding: [50, 280, 180, 50],
});

map.on('click', function () {
    if (hoveredFeature && selectedFeature && hoveredFeature !== selectedFeature) {
        selectedFeature.set('hover', HOVER_NONE);
        selectedFeature = null;
    }

    if (hoveredFeature && !selectedFeature) {
        selectedFeature = hoveredFeature;
        selectedFeature.set('hover', HOVER_SELECTED);
        return;
    }

    if (!hoveredFeature && selectedFeature) {
        selectedFeature.set('hover', HOVER_NONE);
        selectedFeature = null;
    }
});

map.on('pointermove', function (e) {
    const target = e.originalEvent.target;
    if (target.nodeName !== 'CANVAS' || e.dragging) {
        return;
    }

    /**
     * @type {PolyFeature|undefined}
     */
    const feature = map.forEachFeatureAtPixel(e.pixel, feature => {
        return feature;
    });

    map.getViewport().style.cursor = feature ? 'pointer' : '';

    if (feature === hoveredFeature) {
        return;
    }

    if (!feature && hoveredFeature) {
        if (hoveredFeature !== selectedFeature) {
            hoveredFeature.set('hover', HOVER_NONE);
        }
        hoveredFeature = null;
        return;
    }

    if (feature && feature !== selectedFeature) {
        feature.set('hover', HOVER_HOVERED);
    }

    if (feature && hoveredFeature && hoveredFeature !== selectedFeature) {
        hoveredFeature.set('hover', HOVER_NONE);
    }

    hoveredFeature = feature;
});

function getSource() {
    const poly_wkt =
        'POLYGON((-4.6374678599 36.2138652585,-4.9581980302 36.0489369546,-4.8397465468 35.7624385835,-4.4734581138 35.7239631285,-4.3404279864 35.9309189813,-4.4042095543 36.1446964813,-4.6374678599 36.2138652585),(-4.652046504 36.0548332176,-4.7632086653 36.025347486,-4.7887212925 35.9191074762,-4.6702698092 35.8866167417,-4.5518183258 35.9146777069,-4.652046504 36.0548332176))';

    const g1 = new WKT().readGeometry(poly_wkt, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
    });

    const source = new VectorSource({});

    source.addFeature(
        new Feature({
            geometry: g1,
            hover: HOVER_NONE,
            name: 'F1',
            internalType: 'type2',
        })
    );

    const g2 = g1.clone();
    g2.translate(70_000, 0);
    source.addFeature(
        new Feature({
            geometry: g2,
            hover: HOVER_NONE,
            name: 'F2',
            internalType: 'type2',
        })
    );

    const g3 = g1.clone();
    g3.translate(0, -70_000);
    source.addFeature(
        new Feature({
            geometry: g3,
            hover: HOVER_NONE,
            name: 'F3',
            internalType: 'type3',
        })
    );

    return source;
}

const elemType = /**@type {HTMLSelectElement}*/ (document.getElementById('layerType'));
elemType.value = 'WEBGL';
elemType.addEventListener('input', e => {
    layer.dispose();
    map.removeLayer(layer);

    const style = elemFilter.checked ? styleFilter : styleCommon;
    switch (elemType.value) {
        case 'WEBGL':
            layer = new VectorLayerWGL({
                style: style,
                source,
            });
            break;
        case 'vector':
            layer = new VectorLayer({
                style: style,
                source,
            });
            break;
    }
    map.addLayer(layer);
});
