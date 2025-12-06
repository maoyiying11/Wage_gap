

let selectedYear = "2015";
let rawData = [];
let activeLegend = null;
let showingLine = false;


function wrap(text, width) {
    text.each(function() {
        const text = d3.select(this);
        const words = text.text().split(/\s+/).reverse();
        let word;
        let line = [];
        let lineNumber = 0;
        const lineHeight = 1.1;
        const y = text.attr("y");
        const dy = parseFloat(text.attr("dy")) || 0;
        let tspan = text.text(null)
            .append("tspan")
            .attr("x", 0)
            .attr("y", y)
            .attr("dy", dy + "em");

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));

            if (tspan.node().getComputedTextLength() > width && line.length > 1) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                    .attr("x", 0)
                    .attr("y", y)

                    .attr("dy", (++lineNumber * lineHeight) + dy + "em")
                    .text(word);
            }
        }
    });
}



d3.csv("stem_salary_gap.csv").then(data => {
    rawData = data.map(d => ({
        country: d.country,
        year: +d.year,
        Female: +d.Female,
        Male: +d.Male,
        Total: (+d.Female + +d.Male) / 2,
        gap: +d.gap
    })).filter(d => d.year >= 2015 && d.year <= 2024);


    drawChart();
    window.addEventListener('resize', drawChart);
});



function drawChart() {

    if (showingLine) return;



    d3.selectAll("svg").remove();
    d3.selectAll(".tooltip-div").remove();
    d3.select("#mini-chart").remove();

    const dataByYear = rawData.filter(d => d.year == selectedYear);

    dataByYear.sort((a, b) => b.gap - a.gap);


    const FIXED_INNER_WIDTH = 1500;
    const width = FIXED_INNER_WIDTH;



    const margin = { top: 30, right: 30, bottom: 200, left: 100 };
    const BASE_CHART_HEIGHT = 750;
    const height = BASE_CHART_HEIGHT - margin.top - margin.bottom;


    const svg = d3.select("body")
        .append("svg")

        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("display", "block")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);


    const x = d3.scaleBand()
        .domain(dataByYear.map(d => d.country))
        .range([0, width])
        .padding(0.3);


    const maxSalary = d3.max(dataByYear, d => Math.max(d.Female, d.Male));
    const y = d3.scaleLinear()
        .domain([0, maxSalary * 1.1])
        .range([height, 0]);


    const color = d3.scaleOrdinal()
        .domain(["Female", "Male"])
        .range(["#E91E63", "#2196F3"]);

    let keys = ["Male", "Female"];

    if (activeLegend) {
        keys = [activeLegend];
    }


    const barWidthFull = x.bandwidth() * 0.9;
    const barWidthOverlap = x.bandwidth() * 0.7;


    svg.append("g")
        .selectAll("g")
        .data(dataByYear)
        .join("g")
        .attr("transform", d => `translate(${x(d.country)},0)`)
        .selectAll("rect")
        .data(d => keys.map(key => ({ key: key, value: d[key], country: d.country, gap: d.gap })))
        .join("rect")
        .attr("x", d => {
            if (activeLegend) {
                return (x.bandwidth() - barWidthFull) / 2;
            } else {
                if (d.key === "Male") {
                    return (x.bandwidth() - barWidthOverlap) / 2 + barWidthOverlap / 2;
                } else {
                    return (x.bandwidth() - barWidthOverlap) / 2;
                }
            }
        })
        .attr("width", activeLegend ? barWidthFull : barWidthOverlap)

        .attr("y", height)
        .attr("height", 0)
        .attr("fill", d => color(d.key))
        .attr("class", d => `bar ${d.key}`)
        .attr("opacity", 1.0)

        .transition()
        .duration(800)
        .delay((d, i) => i * 50)
        .attr("y", d => y(d.value))
        .attr("height", d => height - y(d.value))

        .on("end", function() {
            d3.select(this)
                .on("mouseover", (event, d) => handleMouseOver(event, d, dataByYear))
                .on("mousemove", handleMouseMove)
                .on("mouseleave", handleMouseLeave);
        });


    const xAxisGroup = svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));


    xAxisGroup.selectAll("text")
        .style("font-size", "10px")
        .style("text-anchor", "end")
        .attr("dx", "-0.8em")
        .attr("dy", "0.15em")
        .attr("transform", "rotate(-45)");


    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d3.format("$,.0f")));


    svg.append("text")
        .attr("x", width / 2)

        .attr("y", height + margin.bottom - 40)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Country (Sorted by Gap Descending)");


    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 20)
        .attr("x", 0 - (height / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Average Annual Salary (USD)");


    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 0)
        .attr("text-anchor", "middle")
        .style("font-size", "22px")
        .style("font-weight", "bold")
        .text(`Gender Salary Comparison in STEM - ${selectedYear}`);


    if (activeLegend === null) {
        const top5 = dataByYear.slice(0, 5).map(d => d.country);
        const bottom5 = dataByYear.slice(-5).map(d => d.country);
        const relevantCountries = new Set([...top5, ...bottom5]);

        svg.append("g")
            .attr("class", "gap-labels-highlight")
            .selectAll("text")
            .data(dataByYear.filter(d => relevantCountries.has(d.country)))
            .join("text")
            .attr("x", d => x(d.country) + x.bandwidth() / 2)
            .attr("y", d => y(Math.max(d.Female, d.Male)) - 5)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .style("fill", d => d.gap > 0 ? "black" : "#D32F2F")
            .text(d => d3.format("$,.0f")(d.gap));
    }


    const legendData = ["Female", "Male"];
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 150}, -20)`);

    legend.selectAll("rect")
        .data(legendData)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 20)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", d => color(d))
        .style("cursor", "pointer")
        .attr("class", d => d === activeLegend ? "legend-rect active" : "legend-rect")
        .on("click", (event, d) => {
            if (activeLegend === d) {
                activeLegend = null;
            } else {
                activeLegend = d;
            }
            drawChart();
            event.stopPropagation();
        });

    legend.selectAll("text")
        .data(legendData)
        .enter()
        .append("text")
        .attr("x", 20)
        .attr("y", (d, i) => i * 20 + 12)
        .text(d => d)
        .style("cursor", "pointer")
        .on("click", (event, d) => {
            if (activeLegend === d) {
                activeLegend = null;
            } else {
                activeLegend = d;
            }
            drawChart();
            event.stopPropagation();
        });

    d3.select("svg").on("click", () => {
        if(activeLegend !== null) {
            activeLegend = null;
            drawChart();
        }
    });

}


function handleMouseOver(event, d, dataByYear) {
    const countryData = dataByYear.find(item => item.country === d.country);

    d3.selectAll(".bar").classed("faded", true);
    d3.select(event.currentTarget).classed("faded", false).classed("highlighted", true);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip-div");

    tooltip.html(`
        <strong>Country:</strong> ${countryData.country}<br/>
        <strong>Female Salary:</strong> ${d3.format("$,.0f")(countryData.Female)}<br/>
        <strong>Male Salary:</strong> ${d3.format("$,.0f")(countryData.Male)}<br/>
        <strong>Gap (M - F):</strong> ${d3.format("$,.0f")(countryData.gap)}
    `);


    drawMiniLineChart(d.country);
}

function handleMouseMove(event, d) {
    const tooltipElement = d3.select(".tooltip-div").node();
    const miniChartElement = d3.select("#mini-chart").node();

    let mouseX = event.clientX;
    let mouseY = event.clientY;


    let tooltipX = mouseX + 15;
    let tooltipY = mouseY - 30;


    if (tooltipElement) {
        const tooltipWidth = tooltipElement.offsetWidth;
        if (tooltipX + tooltipWidth > window.innerWidth) {
            tooltipX = mouseX - 15 - tooltipWidth;
        }

        d3.select(".tooltip-div")
            .style("left", tooltipX + "px")
            .style("top", tooltipY + "px");


        if (miniChartElement) {
            let miniChartX = mouseX + 15;
            const miniChartWidth = miniChartElement.offsetWidth;
            const miniChartHeight = miniChartElement.offsetHeight;


            if (miniChartX + miniChartWidth > window.innerWidth) {
                miniChartX = mouseX - 15 - miniChartWidth;
            }


            let miniChartY_below = tooltipY + tooltipElement.offsetHeight + 10;


            if (miniChartY_below + miniChartHeight > window.innerHeight) {

                let miniChartY_above = tooltipY - miniChartHeight - 10;


                var finalMiniChartY = miniChartY_above;

            } else {

                var finalMiniChartY = miniChartY_below;
            }

            d3.select("#mini-chart")
                .style("left", miniChartX + "px")
                .style("top", finalMiniChartY + "px");
        }
    }
}


function handleMouseLeave() {
    d3.selectAll(".tooltip-div").remove();
    d3.select("#mini-chart").remove();
    d3.selectAll(".bar").classed("faded", false).classed("highlighted", false);
}


function drawMiniLineChart(country) {

    d3.select("#mini-chart").remove();

    const series = rawData.filter(d => d.country === country);
    if (series.length === 0) return;


    const margin = { top: 15, right: 10, bottom: 10, left: 10 };
    const width = 250 - margin.left - margin.right;
    const height = 120 - margin.top - margin.bottom;

    const miniChartDiv = d3.select("body").append("div")
        .attr("id", "mini-chart")
        .style("position", "fixed");


    const svg = miniChartDiv
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint()
        .domain(series.map(d => d.year))
        .range([0, width])
        .padding(1);

    const maxAbsGap = d3.max(series, d => Math.abs(d.gap));
    const y = d3.scaleLinear()
        .domain([-maxAbsGap * 1.2, maxAbsGap * 1.2])
        .range([height, 0]);

    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.gap));


    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(0))
        .attr("y2", y(0))
        .attr("stroke", "black")
        .attr("stroke-dasharray", "2");


    svg.append("path")
        .datum(series)
        .attr("fill", "none")
        .attr("stroke", "#FF5722")
        .attr("stroke-width", 2)
        .attr("d", line);


    svg.selectAll("circle")
        .data(series)
        .join("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.gap))
        .attr("r", 4)
        .attr("fill", "#FF5722");


    svg.append("text")
        .attr("x", x(series[0].year))
        .attr("y", y(series[0].gap) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .text(d3.format("$,.0f")(series[0].gap));


    svg.append("text")
        .attr("x", x(series[series.length - 1].year))
        .attr("y", y(series[series.length - 1].gap) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .text(d3.format("$,.0f")(series[series.length - 1].gap));
}



document.querySelectorAll(".year-btn").forEach(button => {
    button.addEventListener("click", function() {
        selectedYear = this.getAttribute("data-year");
        document.querySelectorAll(".year-btn").forEach(btn => btn.classList.remove("active"));
        this.classList.add("active");
        activeLegend = null;
        drawChart();
    });
});