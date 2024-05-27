document.getElementById('table-button').addEventListener('click', function() {
    d3.select("#chart-content").style("display", "none");
    d3.select("#map-content").style("display", "none");
    d3.select("#table-content").style("display", "block");
    d3.select("#table-content").html(""); // Clear previous content

    const tableContent = d3.select("#table-content");

    // Add the search input
    const searchInput = tableContent.append("input")
        .attr("type", "text")
        .attr("id", "search-input")
	.attr("height", "200px")
        .attr("placeholder", "Search for week number...");

    d3.csv("mortality-number.csv").then(data => {
        const table = tableContent.append("table").attr("class", "table");
        const thead = table.append("thead");
        const tbody = table.append("tbody");

        // Extract column names
        const columns = Object.keys(data[0]);

        // Append the header row
        thead.append("tr")
            .selectAll("th")
            .data(columns)
            .enter()
            .append("th")
            .text(d => d);

        // Function to update the table based on filtered data
        function updateTable(filteredData, columnsToShow = columns) {
            // Clear existing rows
            tbody.html("");

            // Update the columns to show the selected columns
            thead.html("");
            thead.append("tr")
                .selectAll("th")
                .data(columnsToShow)
                .enter()
                .append("th")
                .text(d => d);

            // Create a row for each object in the filtered data
            const rows = tbody.selectAll("tr")
                .data(filteredData)
                .enter()
                .append("tr");

            // Create a cell in each row for each column
            rows.selectAll("td")
                .data(d => columnsToShow.map(column => ({ column: column, value: d[column] })))
                .enter()
                .append("td")
                .text(d => d.value);

            // Add search functionality
            searchInput.on("input", function() {
                const searchTerm = this.value.toLowerCase();
                rows.each(function(d) {
                    const row = d3.select(this);
                    const isMatch = d.Week.toString().toLowerCase().includes(searchTerm);
                    row.style("display", isMatch ? "" : "none");
                    if (isMatch && searchTerm) {
                        row.classed("highlight", true);
                    } else {
                        row.classed("highlight", false);
                    }
                });
            });
        }

        // Initial load of the table with all data
        updateTable(data);

        // Add event listener to the country select dropdown
        d3.select("#country-select").on("change", function() {
            const selectedCountry = this.value;
            if (selectedCountry === "all") {
                // Show all columns if "all" is selected
                updateTable(data, columns);
            } else {
                const filteredData = data.map(row => ({
                    Week: row.Week,
                    Country: selectedCountry,
                    Deaths: row[selectedCountry]
                }));

                // Update the columns to show only Week and selected country
                thead.html("");
                thead.append("tr")
                    .selectAll("th")
                    .data(["Week", selectedCountry])
                    .enter()
                    .append("th")
                    .text(d => d);

                // Update the table with filtered data
                updateTable(filteredData, ["Week", "Deaths"]);
            }
        });
    }).catch(function(error) {
        console.error("Error loading CSV data:", error);
    });
});
