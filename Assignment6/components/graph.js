import {useEffect, useMemo, useRef} from 'react'; 
import * as d3 from 'd3';
import { getNodes } from '../utils/getNodes';
import { getLinks } from '../utils/getLinks';   
import {drag} from '../utils/drag';


export function Graph(props) {
        const { margin, svg_width, svg_height, data } = props;

        const nodes = useMemo(() => getNodes({rawData: data}), [data]);
        const links = useMemo(() => getLinks({rawData: data}), [data]);
    
        const width = svg_width - margin.left - margin.right;
        const height = svg_height - margin.top - margin.bottom;

        const lineWidth = d3.scaleSqrt().range([1.5, 8]).domain([d3.min(links, d => d.value), d3.max(links, d => d.value)]);
        const radius = d3.scaleSqrt().range([12, 48])
                .domain([d3.min(nodes, d => d.value), d3.max(nodes, d => d.value)]);
        const color = d3.scaleOrdinal()
            .range(d3.schemeCategory10)
            .domain(nodes.map( d => d.name));
        
        const d3Selection = useRef();
        useEffect( ()=>{
            const graphNodes = nodes.map(d => ({ ...d }));
            const graphLinks = links.map(d => ({ ...d }));
            const maxLinkValue = d3.max(graphLinks, d => d.value);
            const minLinkValue = d3.min(graphLinks, d => d.value);
            const linkDistance = d3.scaleLinear()
                .range([170, 70])
                .domain([minLinkValue, maxLinkValue]);
            const labelPadding = 8;
            const legendX = 12;
            const legendY = 16;
            
            let g = d3.select(d3Selection.current);
            g.selectAll("*").remove();

            const simulation =  d3.forceSimulation(graphNodes)
                .force("link", d3.forceLink(graphLinks).id(d => d.name).distance(d => linkDistance(d.value)).strength(0.75))
                .force("charge", d3.forceManyBody().strength(-650))
                .force("center", d3.forceCenter(width/2, height/2 + 18))
                .force("x", d3.forceX(width/2).strength(0.04))
                .force("y", d3.forceY(height/2 + 18).strength(0.04))
                .force("collide", d3.forceCollide().radius(d => radius(d.value)+30).iterations(2));
             
            const link = g.append("g")
                .attr("stroke", "#b8b8b8")
                .attr("stroke-opacity", 0.72)
                .attr("stroke-linecap", "round")
                .selectAll("line")
                .data(graphLinks)
                .join("line")
                .attr("stroke-width", d => lineWidth(d.value));

            link.append("title")
                .text(d => `${d.source.name || d.source} - ${d.target.name || d.target}: ${d.value} patients`);

            const node = g.append("g")
                .selectAll("g")
                .data(graphNodes)
                .join("g")
                .attr("cursor", "grab")
                .call(drag(simulation));

            const point = node.append("circle")
                .attr("r", d => radius(d.value))
                .attr("fill", d => color(d.name))
                .attr("stroke", "#fff")
                .attr("stroke-width", 2);

            point.append("title")
                .text(d => `${d.name}: ${d.value} patients`);

            const tooltip = g.append("text")
                .attr("font-size", 20)
                .attr("font-weight", 700)
                .attr("fill", "#111")
                .attr("paint-order", "stroke")
                .attr("stroke", "white")
                .attr("stroke-width", 4)
                .attr("stroke-linejoin", "round")
                .attr("text-anchor", "middle")
                .style("pointer-events", "none")
                .style("opacity", 0);

            const showTooltip = (event, d) => {
                tooltip
                    .text(d.name)
                    .attr("x", d.x)
                    .attr("y", d.y - radius(d.value) - 8)
                    .style("opacity", 1);
            };

            const hideTooltip = () => {
                tooltip.style("opacity", 0);
            };

            node
                .on("mouseover", showTooltip)
                .on("mousemove", showTooltip)
                .on("mouseout", hideTooltip);
             
            const legend = g.append("g")
                .attr("transform", `translate(${legendX}, ${legendY})`)
                .attr("font-size", 12)
                .attr("dominant-baseline", "middle")
                .selectAll("g")
                .data(graphNodes)
                .join("g")
                .attr("transform", (d, i) => `translate(0, ${i * 18})`);

            legend.append("rect")
                .attr("width", 12)
                .attr("height", 12)
                .attr("y", -6)
                .attr("fill", d => color(d.name));

            legend.append("text")
                .attr("x", 18)
                .attr("fill", "#333")
                .text(d => d.name);

            simulation.on("tick", () => {
                graphNodes.forEach(d => {
                    const nodeRadius = radius(d.value);
                    d.x = Math.max(nodeRadius + labelPadding, Math.min(width - nodeRadius - labelPadding, d.x));
                    d.y = Math.max(nodeRadius + labelPadding, Math.min(height - nodeRadius - labelPadding, d.y));
                });

                link
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);

                point
                    .attr("cx", d => d.x)
                    .attr("cy", d => d.y);
            });

            return () => simulation.stop();

        }, [nodes, links, width, height, lineWidth, radius, color])


        return <svg 
            viewBox={`0 0 ${svg_width} ${svg_height}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", height: "100%" }}
            > 
                <g ref={d3Selection} transform={`translate(${margin.left}, ${margin.top})`}>
                </g>
            </svg>
    };
