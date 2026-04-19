import { treemap, hierarchy, scaleOrdinal, schemeDark2, format } from "d3";

function Text({ node, displayValue }) {
    const width = node.x1 - node.x0;
    const height = node.y1 - node.y0;
    const labels = node.ancestors()
        .filter(d => d.depth > 0)
        .map(d => `${d.data.attr}: ${d.data.name}`);
    const textLines = [...labels, `Value: ${displayValue}`];
    const showDetail = width > 80 && height > 58;
    const showLargeLabel = width > 120 && height > 95;

    return <>
        {showDetail && <text
            x={node.x0 + 8}
            y={node.y0 + 18}
            fill="white"
            fontSize={14}
            fontWeight={600}
        >
            {textLines.map((line, i) => (
                <tspan key={line} x={node.x0 + 8} dy={i === 0 ? 0 : 20}>
                    {line}
                </tspan>
            ))}
        </text>}
        {showLargeLabel && <text
            x={(node.x0 + node.x1) / 2}
            y={(node.y0 + node.y1) / 2}
            fill="rgba(0, 0, 0, 0.25)"
            fontSize={Math.min(54, width / 6)}
            fontWeight={800}
            textAnchor="middle"
            dominantBaseline="middle"
        >
            {labels[labels.length - 1]}
        </text>}
    </>;
}

export function TreeMap(props) {
    const { margin, svg_width, svg_height, tree, selectedCell, setSelectedCell } = props;

    const innerWidth = svg_width - margin.left - margin.right;
    const innerHeight = svg_height - margin.top - margin.bottom;

    const root = hierarchy(tree)
        .sum(d => d.value || 0)
        .sort((a, b) => b.value - a.value);

    treemap()
        .size([innerWidth, innerHeight])
        .paddingOuter(2)
        .paddingInner(2)
        .round(true)(root);

    const leaves = root.leaves();
    const color = scaleOrdinal(schemeDark2)
        .domain(root.children ? root.children.map(d => d.data.name) : []);
    const valueFormat = format(",");

    const getTopLevelName = (node) => {
        const topLevel = node.ancestors().find(d => d.depth === 1);
        return topLevel ? topLevel.data.name : node.data.name;
    };

    return <svg
        viewBox={`0 0 ${svg_width} ${svg_height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "100%" }}
    >
        <g transform={`translate(${margin.left}, ${margin.top})`}>
            {leaves.map((node, i) => {
                const width = node.x1 - node.x0;
                const height = node.y1 - node.y0;
                const cellKey = node.ancestors()
                    .filter(d => d.depth > 0)
                    .map(d => `${d.data.attr}:${d.data.name}`)
                    .join("|");
                const isSelected = selectedCell === cellKey;
                const clipId = `treemap-clip-${i}`;

                return <g
                    key={cellKey}
                    onClick={() => setSelectedCell(cellKey)}
                    style={{ cursor: "pointer" }}
                >
                    <defs>
                        <clipPath id={clipId}>
                            <rect
                                x={node.x0}
                                y={node.y0}
                                width={width}
                                height={height}
                            />
                        </clipPath>
                    </defs>
                    <rect
                        x={node.x0}
                        y={node.y0}
                        width={width}
                        height={height}
                        fill={color(getTopLevelName(node))}
                        stroke={isSelected ? "#111" : "white"}
                        strokeWidth={isSelected ? 3 : 1.5}
                        opacity={selectedCell && !isSelected ? 0.72 : 0.9}
                    />
                    <g clipPath={`url(#${clipId})`}>
                        <Text node={node} displayValue={valueFormat(node.value)} />
                    </g>
                    <title>
                        {`${node.ancestors()
                            .filter(d => d.depth > 0)
                            .map(d => `${d.data.attr}: ${d.data.name}`)
                            .join(", ")}; Value: ${valueFormat(node.value)}`}
                    </title>
                </g>
            })}
        </g>
    </svg>;

}

  
