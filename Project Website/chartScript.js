document.getElementById('chart-button').addEventListener('click', function() {
    d3.select("#table-content").style("display", "none");
    d3.select("#map-content").style("display", "none");
    d3.select("#chart-content").style("display", "block");

    const chartContent = d3.select("#chart-content");
    chartContent.html(""); // Clear previous content

    const margin = { top: 20, right: 20, bottom: 30, left: 50 },
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    const svg = chartContent.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const x = d3.scaleTime().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.deaths))
        .defined(d => d.deaths !== null); // Ignore points with null values

    d3.csv("mortality-number.csv").then(data => {
        const parseDate = d3.timeParse("%W");

        const countryData = {};
        data.forEach(d => {
            const week = parseDate(d.Week);
            for (const country of Object.keys(d)) {
                if (country !== "Week") {
                    if (!countryData[country]) {
                        countryData[country] = [];
                    }
                    countryData[country].push({ date: week, week: +d.Week, deaths: d[country] === 'null' ? null : +d[country] });
                }
            }
        });

        const countrySelect = d3.select("#country-select");
        countrySelect.selectAll("option")
            .data(Object.keys(countryData))
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d);

        countrySelect.on("change", updateChart);

        let playInterval;

        function updateChart() {
            const selectedCountry = countrySelect.property("value");
            const data = countryData[selectedCountry];

            x.domain(d3.extent(data, d => d.date));
            y.domain([0, d3.max(data, d => d.deaths)]);

            svg.selectAll("*").remove();

            svg.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x));

            svg.append("g")
                .call(d3.axisLeft(y));

            svg.append("path")
                .datum(data)
                .attr("class", "line")
                .attr("d", line)
                .attr("stroke", "steelblue")
                .attr("stroke-width", 2)
                .attr("fill", "none");

            svg.selectAll(".dot")
                .data(data)
                .enter().append("circle")
                .attr("class", "dot")
                .attr("cx", d => x(d.date))
                .attr("cy", d => y(d.deaths))
                .attr("r", 5)
                .attr("fill", "steelblue")
                .on("mouseover", function(event, d) {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip.html(`Deaths: ${d.deaths !== null ? d.deaths : 'No data'}`)
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });

            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0)
                .style("position", "absolute")
                .style("text-align", "center")
                .style("width", "auto")
                .style("height", "auto")
                .style("padding", "5px")
                .style("font", "12px sans-serif")
                .style("background", "lightsteelblue")
                .style("border", "0px")
                .style("border-radius", "8px")
                .style("pointer-events", "none");

            // Add zoom and pan functionality
            const zoom = d3.zoom()
                .scaleExtent([1, 10])
                .translateExtent([[-width, -height], [2 * width, 2 * height]])
                .on("zoom", zoomed);

            svg.call(zoom);

            function zoomed(event) {
                const transform = event.transform;
                const newX = transform.rescaleX(x);
                const newY = transform.rescaleY(y);

                svg.select(".line").attr("d", line.x(d => newX(d.date)).y(d => newY(d.deaths)));
                svg.selectAll(".dot")
                    .attr("cx", d => newX(d.date))
                    .attr("cy", d => newY(d.deaths));
                svg.select("g.x.axis").call(d3.axisBottom(newX));
                svg.select("g.y.axis").call(d3.axisLeft(newY));
            }
        }

        function playTimelapse() {
            let currentWeek = 0;
            const totalWeeks = countryData["Australia"].length;

            if (playInterval) clearInterval(playInterval);

            playInterval = setInterval(() => {
                if (currentWeek >= totalWeeks) {
                    clearInterval(playInterval);
                    return;
                }

                const selectedCountry = countrySelect.property("value");
                const data = countryData[selectedCountry].slice(0, currentWeek + 1);

                x.domain(d3.extent(data, d => d.date));
                y.domain([0, d3.max(data, d => d.deaths)]);

                svg.selectAll("*").remove();

                svg.append("g")
                    .attr("transform", "translate(0," + height + ")")
                    .call(d3.axisBottom(x));

                svg.append("g")
                    .call(d3.axisLeft(y));

                svg.append("path")
                    .datum(data)
                    .attr("class", "line")
                    .attr("d", line)
                    .attr("stroke", "steelblue")
                    .attr("stroke-width", 2)
                    .attr("fill", "none");

                svg.selectAll(".dot")
                    .data(data)
                    .enter().append("circle")
                    .attr("class", "dot")
                    .attr("cx", d => x(d.date))
                    .attr("cy", d => y(d.deaths))
                    .attr("r", 5)
                    .attr("fill", "steelblue")
                    .on("mouseover", function(event, d) {
                        tooltip.transition()
                            .duration(200)
                            .style("opacity", .9);
                        tooltip.html(`Deaths: ${d.deaths !== null ? d.deaths : 'No data'}`)
                            .style("left", (event.pageX + 5) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function() {
                        tooltip.transition()
                            .duration(500)
                            .style("opacity", 0);
                    });

                const tooltip = d3.select("body").append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0)
                    .style("position", "absolute")
                    .style("text-align", "center")
                    .style("width", "auto")
                    .style("height", "auto")
                    .style("padding", "5px")
                    .style("font", "12px sans-serif")
                    .style("background", "lightsteelblue")
                    .style("border", "0px")
                    .style("border-radius", "8px")
                    .style("pointer-events", "none");

                currentWeek++;
            }, 1000); // Change the interval time as needed
        }

        document.getElementById('play-timelapse').addEventListener('click', playTimelapse);

        updateChart();
    }).catch(function(error) {
        console.error("Error loading CSV data:", error);
    });
});
