document.getElementById('map-button').addEventListener('click', function() {
    d3.select("#table-content").style("display", "none");
    d3.select("#chart-content").style("display", "none");
    d3.select("#map-content").style("display", "block");

    const mapContent = d3.select("#map-content");
    mapContent.html(""); // Clear previous content

    const width = 1300;
    const height = 550;

    const svg = mapContent.append("svg")
        .attr("width", width)
        .attr("height", height);

    const projection = d3.geoMercator()
        .scale(150)
        .translate([width / 2, height / 1.5]);

    const path = d3.geoPath().projection(projection);

    const highlightedCountries = [
        "Australia", "Canada", "France", "Germany", "Israel", 
        "Italy", "New Zealand", "Spain", "United Kingdom", "United States of America"
    ];

    d3.json("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson").then(function(world) {
        d3.csv("mortality-number.csv").then(function(data) {
            const countryData = {};
            const weekData = d3.group(data, d => d.Week);
            const totalWeeks = d3.max(data, d => +d.Week);

            for (const [week, records] of weekData.entries()) {
                countryData[week] = {};
                highlightedCountries.forEach(country => {
                    const record = records.find(r => r.Week === week);
                    countryData[week][country] = record ? +record[country] : 0;
                });
            }

            const countries = svg.append("g")
                .selectAll("path")
                .data(world.features)
                .enter().append("path")
                .attr("class", d => highlightedCountries.includes(d.properties.ADMIN) ? "country highlighted" : "country other")
                .attr("d", path)
                .attr("fill", d => highlightedCountries.includes(d.properties.ADMIN) ? "steelblue" : "#ccc")
                .attr("stroke", "#fff")
                .attr("stroke-width", 0.5)
                .on("mouseover", function(event, d) {
                    if (highlightedCountries.includes(d.properties.ADMIN)) {
                        d3.select(this).attr("fill", "orange");
                        tooltip.transition().duration(200).style("opacity", .9);
                        tooltip.html(d.properties.ADMIN)
                            .style("left", (event.pageX) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    }
                })
                .on("mouseout", function(event, d) {
                    if (highlightedCountries.includes(d.properties.ADMIN)) {
                        d3.select(this).attr("fill", colorScale(currentWeek));
                        tooltip.transition().duration(500).style("opacity", 0);
                    }
                })
                .on("click", function(event, d) {
                    if (highlightedCountries.includes(d.properties.ADMIN)) {
                        const country = d.properties.ADMIN;
                        const deaths = countryData[currentWeek][country];
                        tooltip.transition().duration(200).style("opacity", .9);
                        tooltip.html(`
                            <div class="tooltip-content">
                                <strong>Country:</strong> ${country}<br>
                                <strong>Week:</strong> ${currentWeek}<br>
                                <strong>Deaths:</strong> ${deaths}
                            </div>
                        `)
                            .style("left", (event.pageX) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    }
                });

            const infoGroup = svg.append("g").attr("class", "info-group");

            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0)
                .style("position", "absolute")
                .style("text-align", "center")
                .style("width", "auto")
                .style("height", "auto")
                .style("padding", "10px")
                .style("font", "14px sans-serif")
                .style("background", "#333")
                .style("color", "#fff")
                .style("border", "0px")
                .style("border-radius", "8px")
                .style("box-shadow", "0 0 10px rgba(0, 0, 0, 0.5)")
                .style("pointer-events", "none");

            let playInterval;
            let currentWeek = 1;

            function playTimelapse() {
                if (playInterval) clearInterval(playInterval);

                playInterval = setInterval(() => {
                    if (currentWeek > totalWeeks) {
                        clearInterval(playInterval);
                        return;
                    }

                    countries.attr("fill", d => {
                        if (highlightedCountries.includes(d.properties.ADMIN)) {
                            return colorScale(currentWeek);
                        } else {
                            return "#ccc";
                        }
                    });

                    infoGroup.selectAll("*").remove();

                    let yPos = 20;
                    highlightedCountries.forEach(country => {
                        const deaths = countryData[currentWeek][country];
                        infoGroup.append("rect")
                            .attr("class", "info-box")
                            .attr("x", width - 150)
                            .attr("y", yPos - 15)
                            .attr("width", 150)
                            .attr("height", 50);

                        infoGroup.append("text")
                            .attr("class", "info-text")
                            .attr("x", width - 140)
                            .attr("y", yPos)
                            .attr("dy", "0em")
                            .text(country);

                        infoGroup.append("text")
                            .attr("class", "info-text")
                            .attr("x", width - 140)
                            .attr("y", yPos)
                            .attr("dy", "1.2em")
                            .text(`Week: ${currentWeek}`);

                        infoGroup.append("text")
                            .attr("class", "info-text")
                            .attr("x", width - 140)
                            .attr("y", yPos)
                            .attr("dy", "2.4em")
                            .text(`Deaths: ${deaths}`);

                        yPos += 50; // Adjust spacing between entries
                    });

                    currentWeek++;
                }, 1000); // Change the interval time as needed
            }

            // Generate a color scale for the number of weeks
            const colorScale = d3.scaleSequential(d3.interpolateRainbow)
                .domain([1, totalWeeks]);

            document.getElementById('play-timelapse').addEventListener('click', playTimelapse);

            // Add a dropdown menu for selecting countries
            const countrySelect = d3.select("#country-select");
            countrySelect.selectAll("option")
                .data(highlightedCountries)
                .enter()
                .append("option")
                .attr("value", d => d)
                .text(d => d);

            countrySelect.on("change", function() {
                const selectedCountry = countrySelect.property("value");
                const countryFeature = world.features.find(d => d.properties.ADMIN === selectedCountry);

                if (countryFeature) {
                    const [[x0, y0], [x1, y1]] = path.bounds(countryFeature);
                    const dx = x1 - x0;
                    const dy = y1 - y0;
                    const x = (x0 + x1) / 2;
                    const y = (y0 + y1) / 2;
                    const scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height)));
                    const translate = [width / 2 - scale * x, height / 2 - scale * y];

                    svg.transition()
                        .duration(750)
                        .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
                }
            });

            const zoom = d3.zoom()
                .scaleExtent([1, 8])
                .on("zoom", function(event) {
                    svg.selectAll('path')
                        .attr("transform", event.transform);
                });

            svg.call(zoom);
        }).catch(function(error) {
            console.error("Error loading CSV data:", error);
        });
    }).catch(function(error) {
        console.error("Error loading GeoJSON data:", error);
    });
});
