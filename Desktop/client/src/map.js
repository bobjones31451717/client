import 'ol/ol.css';
import Draw from 'ol/interaction/Draw';
import Map from 'ol/Map';
import View from 'ol/View';
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style';
import {OSM, Vector as VectorSource} from 'ol/source';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import GeoJSON from 'ol/format/GeoJSON';
import React, { useRef, useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import useSWR from 'swr'
import { useSelector, useDispatch } from "react-redux";

import Overlay from 'ol/Overlay';
import ToolTip from './toolTip'


const MapWrapper = ({updatePolygon, needToUpdatePolygon}) => {
    const { data } = useSWR(
        `http://localhost:3001/todos`);

    const hideAllChecked = useSelector((state) => state.hideAllChecked);
    const dispatch = useDispatch();

    const useStyles = makeStyles({
        map: {
            height: "400px",
            width: "55%",
            display: "inline-block",
            padding: "14px"
        }
      });
    const classes = useStyles();

    let targetRef = useRef();
    let mapRef = useRef();
    let featureRef = useRef(null);
    let sourceRef = useRef(new VectorSource({wrapX: false}));
    let sourceAllPoligons = useRef(new VectorSource({}))
    let GeoJSONRef = useRef(new GeoJSON())
    let selectedRef = useRef(null);
    let [toolData,setToolData] = useState()
    let overlayRef = useRef(null)

      
    const layerAllPoligons = new VectorLayer({
        source: sourceAllPoligons.current
      });

    const raster = new TileLayer({
        source: new OSM(),
    });
    
    const vector = new VectorLayer({
    source: sourceRef.current,
    });

    useEffect(() => {
      const container = document.getElementById('popup');
      if(!needToUpdatePolygon){
        overlayRef.current = new Overlay({
          element: container,
          autoPan: true,
          autoPanAnimation: {
            duration: 250,
          },
        });
      }
      else{
        overlayRef.current = new Overlay({
          
        });
      }
      

          const map = new Map({
            layers: [raster, vector,layerAllPoligons],
            overlays: [overlayRef.current],
            target: targetRef.current,
            view: new View({
              center: [-11000000, 4600000],
              zoom: 4,
            }),
          });
          mapRef.current = map
          var draw; 
        function addInteraction() {
          var value = "Polygon";
            draw = new Draw({
              source: sourceRef.current,
              type: "Polygon",
            });
            mapRef.current.addInteraction(draw);
        }
        
        const highlightStyle = new Style({
          fill: new Fill({
            color: 'rgba(255,255,255,0.7)',
          }),
          stroke: new Stroke({
            color: '#3399CC',
            width: 3,
          }),
        });
        

        sourceRef.current.on('addfeature', function(evt){
            const feature = evt.feature
            dispatch({ type: "FeatureReadyForSubmition", bool: true }); 

            if (featureRef.current === null){
                featureRef.current = feature
            }
            else{
                console.log(featureRef.current)
                sourceRef.current.removeFeature(featureRef.current);
                featureRef.current = feature
            }

            if(needToUpdatePolygon){
                const writer = new GeoJSON();
                const geojsonObject = writer.writeFeatureObject(featureRef.current);
                updatePolygon(geojsonObject)
            }
            
        });
        if(!needToUpdatePolygon){
        
        map.on('pointermove', function (e) {
          if (selectedRef.current !== null) {
            selectedRef.current.setStyle(undefined);
            selectedRef.current = null;
            overlayRef.current.setPosition(undefined);
          }
        
          map.forEachFeatureAtPixel(e.pixel, function (f) {
            var coordinate = f.getGeometry().getFirstCoordinate();
            selectedRef.current = f;
            setToolData('You clicked here: ' + f.get("todo"));
            overlayRef.current.setPosition(coordinate);
            f.setStyle(highlightStyle);
            return true;
          });
        })
      }
        if(needToUpdatePolygon){
        addInteraction()
        }
          
      }, []);



      useEffect( () => {
        
        if(!needToUpdatePolygon){
          if(data){
            sourceAllPoligons.current.clear()
              data.todos.map(todo => {
                const feat = GeoJSONRef.current.readFeature(todo.geojsonObject);
                feat.set("todo",todo.message)
                sourceAllPoligons.current.addFeature(feat)
              })
            }

          }
        
    }, [data?data.todos.length:0]);

    useEffect( () => {
        
      if(!needToUpdatePolygon && data){
        sourceAllPoligons.current.clear()
        if(!hideAllChecked){
          data.todos.map(todo => {
            const feat = GeoJSONRef.current.readFeature(todo.geojsonObject);
            feat.set("todo",todo.message)
            sourceAllPoligons.current.addFeature(feat)
          })
        }
        else{
          data.todos.map(todo => {
            if(!todo.checked){
            const feat = GeoJSONRef.current.readFeature(todo.geojsonObject);
            feat.set("todo",todo.message)
            sourceAllPoligons.current.addFeature(feat)
            }
          })
        }
        }
  }, [hideAllChecked]);



return(
    <div ref={targetRef} className={classes.map}>
      {
        !needToUpdatePolygon && 
        <ToolTip toolData = {toolData} />
      }
      
    </div>
    
    )
}
      

export default MapWrapper;
      