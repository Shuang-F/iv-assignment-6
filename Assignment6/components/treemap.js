import { treemap, hierarchy, scaleOrdinal, schemeDark2, format } from "d3";

function Text({ node, displayValue }) {
    const width = node.x1 - node.x0;
    const height = node.y1 - node.y0;
    const labels = node.ancestors()
        .filter(d => d.depth > 0)
        .map(d => `${d.data.attr}: ${d.data.name}`);
    const leafLabel = `${node.data.attr}: ${node.data.name}`;
    const textLines = [leafLabel, `Value: ${displayValue}`];
    const showDetail = width > 62 && height > 46;
    const showLargeLabel = width > 120 && height > 95;

    return <>
        {showDetail && <text
            x={node.x0 + 8}
            y={node.y0 + 18}
            fill="white"
            fontSize={13}
            fontWeight={600}
        >
            {textLines.map((line, i) => (
                <tspan key={line} x={node.x0 + 8} dy={i === 0 ? 0 : 18}>
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
    const legendHeight = 28;
    const treemapHeight = innerHeight - legendHeight;

    const root = hierarchy(tree)
        .sum(d => d.children ? 0 : d.value || 0)
        .sort((a, b) => b.value - a.value);

    treemap()
        .size([innerWidth, treemapHeight])
        .paddingOuter(2)
        .paddingInner(2)
        .round(true)(root);

    const leaves = root.leaves();
    const colorDepth = root.height >= 2 ? 2 : 1;
    const colorNodes = root.descendants().filter(d => d.depth === colorDepth);
    const color = scaleOrdinal(schemeDark2).domain(colorNodes.map(d => d.data.name));
    const valueFormat = format(",");
    const percentFormat = format(".1%");

    const getColorNode = (node) => {
        return node.ancestors().find(d => d.depth === colorDepth) || node;
    };

    const getDisplayValue = (node) => {
        if (!node.parent || !node.parent.value) {
            return valueFormat(node.value);
        }
        return percentFormat(node.value / node.parent.value);
    };

    const rootGroups = root.children || [];
    const groupColor = "rgba(0, 0, 0, 0.25)";
    const legendAttr = colorNodes[0]?.data.attr || "";
    const legendItems = colorNodes
        .filter((node, index, arr) => arr.findIndex(d => d.data.name === node.data.name) === index);

    const getGroupTransform = (node) => {
        const x = (node.x0 + node.x1) / 2;
        const y = legendHeight + (node.y0 + node.y1) / 2;
        const width = node.x1 - node.x0;
        const height = node.y1 - node.y0;
        const rotate = height > width * 1.4 ? ` rotate(90 ${x} ${y})` : "";
        return { x, y, rotate, size: Math.min(46, Math.max(20, Math.min(width, height) / 3)) };
    };

    return <svg
        viewBox={`0 0 ${svg_width} ${svg_height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "100%" }}
    >
        <g transform={`translate(${margin.left}, ${margin.top})`}>
            <g transform="translate(0, 8)">
                {legendItems.map((node, i) => (
                    <g key={`${legendAttr}-${node.data.name}`} transform={`translate(${i * 145}, 0)`}>
                        <rect
                            width={14}
                            height={14}
                            fill={color(node.data.name)}
                        />
                        <text
                            x={20}
                            y={12}
                            fontSize={13}
                            fill="#111"
                        >
                            {`${legendAttr}: ${node.data.name}`}
                        </text>
                    </g>
                ))}
            </g>
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
                                y={node.y0 + legendHeight}
                                width={width}
                                height={height}
                            />
                        </clipPath>
                    </defs>
                    <rect
                        x={node.x0}
                        y={node.y0 + legendHeight}
                        width={width}
                        height={height}
                        fill={color(getColorNode(node).data.name)}
                        stroke={isSelected ? "#111" : "white"}
                        strokeWidth={isSelected ? 3 : 1.5}
                        opacity={selectedCell && !isSelected ? 0.72 : 0.9}
                    />
                    <g clipPath={`url(#${clipId})`}>
                        <Text
                            node={{
                                ...node,
                                x0: node.x0,
                                x1: node.x1,
                                y0: node.y0 + legendHeight,
                                y1: node.y1 + legendHeight,
                                ancestors: () => node.ancestors(),
                                data: node.data
                            }}
                            displayValue={getDisplayValue(node)}
                        />
                    </g>
                    <title>
                        {`${node.ancestors()
                            .filter(d => d.depth > 0)
                            .map(d => `${d.data.attr}: ${d.data.name}`)
                            .join(", ")}; Count: ${valueFormat(node.value)}`}
                    </title>
                </g>
            })}
            {rootGroups.map((node) => {
                const label = `${node.data.attr}: ${node.data.name}`;
                const transform = getGroupTransform(node);

                return <g key={label} style={{ pointerEvents: "none" }}>
                    <rect
                        x={node.x0}
                        y={node.y0 + legendHeight}
                        width={node.x1 - node.x0}
                        height={node.y1 - node.y0}
                        fill="none"
                        stroke="#111"
                        strokeWidth={1.5}
                    />
                    <text
                        x={transform.x}
                        y={transform.y}
                        transform={transform.rotate}
                        fill={groupColor}
                        fontSize={transform.size}
                        fontWeight={800}
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {label}
                    </text>
                </g>;
            })}
        </g>
    </svg>;

}

  
