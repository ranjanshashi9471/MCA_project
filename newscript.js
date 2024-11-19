//global variables
let db; // Global variable to hold the database instance
let rows = 0;
let chunkSize = 50;

// Function to initialize the database
function initializeDatabase() {
	return initSqlJs().then((SQL) => {
		db = new SQL.Database();
		console.log("Database created");
	});
}

function renderSchemaInput() {
	const space = document.getElementById("rest-all-input");
	space.innerHTML = "";
	space.innerHTML = `<input name="schema-input" type="file" onchange="loadSchema(event)" style="margin-left: 10px" />`;
	closeSidePanel();
}

function renderSQLInput() {
	const space = document.getElementById("rest-all-input");
	space.innerHTML = "";
	space.innerHTML = `<h3>Enter your query</h3>
        <textarea rows = "5" cols="40" id = "query-input" spellcheck="false"></textarea>
		<input type="button"  onclick="runQuery(event)" value="Submit">`;
	closeSidePanel();
}

function addNewSheetInput() {
	const space = document.getElementById("rest-all-input");
	space.innerHTML = "";
	space.innerHTML = `
  		<div id="user-input">
    		<input type="number" id="rows" placeholder = "Enter number of rows"/>
    		<input type="number" id="columns" placeholder = "Enter number of columns (max 26)"/>
			<button onclick= "renderNewSpreadsheet()">Render Spreadsheet</button>
  		<div>`;
	closeSidePanel();
}

function renderNewSpreadsheet() {
	const rows = document.getElementById("rows").value;
	const columns = document.getElementById("columns").value % 26;
	const randomname = `a` + Math.floor(Math.random() * 10000);
	let query = `CREATE TABLE ${randomname} (c0 INTEGER PRIMARY KEY`;

	//constructing query to create table
	for (let i = 1; i < columns; i++) {
		query += ` ,"c${i}" TEXT`;
	}
	query += `);`;

	//creating table
	db.run(query);
	renderSheetsNames();

	console.log("created table");
	const noOfIterations = Math.ceil(rows / chunkSize);
	for (let k = 0; k < noOfIterations; k++) {
		const limit = Math.min(rows, (k + 1) * chunkSize - 1);
		const start = k * chunkSize;
		query = `INSERT INTO ${randomname} values`;
		for (let i = start; i < limit; i++) {
			if (i != start) query += `, (${i}`;
			else query += ` (${i}`;
			for (let j = 1; j < columns; j++) {
				query += ` ,""`;
			}
			query += `)`;
		}
		query += `;`;
		//insering empty rows
		db.run(query);
	}
	renderSheet(randomname);
}

function renderSheet(sheetName) {
	const restInput = document.getElementById("rest-all-input");
	restInput.innerHTML = "";
	restInput.innerHTML = `
		<div style="margin: 10px 0px">
          <button name="${sheetName}" id ="${sheetName}-add" onclick = "add('${sheetName}')">Add ${sheetName}</button>
          <button name="${sheetName}" onclick="saveJson(event)" style="margin-left: 10px">
              Save JSON
          </button>
          <input name="${sheetName}" type="file" id ="${sheetName}-loadjson" onchange = "loadJson(event)" style="margin-left: 10px" />
          <button name="${sheetName}" onclick="generateOutput(event)" style="margin-left: 10px">
              Generate Output
          </button>
        </div>
	`;
	//rendering the structure of sheet
	const userSelect = document.getElementById("user-select");
	userSelect.innerHTML = "";
	userSelect.innerHTML = `
        <table border="1">
            <thead>
              <tr class = "table-header" id = "${sheetName}_header"></tr>
            </thead>
            <tbody id="${sheetName}-data-input" class = "table-body">
              <!-- Dynamic rows will be added here -->
            </tbody>
        </table>
    `;
	const dataInput = document.getElementById(`${sheetName}-data-input`);
	const tableHeader = document.getElementById(`${sheetName}_header`);
	const result = db.exec(`Select * from ${sheetName};`);

	//rendering column names
	result[0].columns.forEach((colname, index) => {
		const headerDesc = document.createElement("td");
		headerDesc.innerHTML = `${colname}`;
		tableHeader.appendChild(headerDesc);
	});

	//rendering rows and columns
	result[0].values.forEach((row, rowId) => {
		const tableRow = document.createElement("tr");
		row.forEach((col, colId) => {
			if (colId != 0) {
				const tableCol = document.createElement("td");
				tableCol.innerHTML = `<input type = "text" oninput = "handleInputChange(event, '${sheetName}', ${row[0]}, '${result[0].columns[colId]}')" value = "${col}"/>`;
				tableRow.appendChild(tableCol);
			} else {
				const tableCol = document.createElement("td");
				tableCol.innerHTML = `${col}`;
				tableRow.appendChild(tableCol);
			}
		});
		dataInput.appendChild(tableRow);
	});
}

function handleInputChange(event, sheetName, row, col) {
	const value = event.target.value;
	db.run(`UPDATE ${sheetName} SET ${col} = "${value}" WHERE c0 = ${row};`);
}

function add(tablename, pagesRendered) {
	// console.log("add called");
	// console.log(tablename);
	const res = db.exec(`PRAGMA table_info (${tablename});`);
	const result = db.exec(`SELECT MAX(id) from ${tablename};`);
	// console.log(result);
	var length = 1;
	if (result[0].values[0][0]) {
		length = result[0].values[0][0] - "0";
		length++;
		console.log(length);
	}
	var query = `INSERT INTO ${tablename} values(${length}`;
	res[0].values.forEach((data, index) => {
		if (index > 0) {
			query = query + `, ""`;
		}
	});
	query = query + `);`;
	db.run(query);
}

function loadSchema(event) {
	const file = event.target.files[0];
	const reader = new FileReader();
	reader.readAsText(file);
	reader.onload = (e) => {
		db.run(e.target.result);
		renderSheetsNames();
		openSidePanel();
	};
}

//sidepanel handlers
function openSidePanel() {
	document.getElementById("sidepanel-items").style.width = "250px";
}

function closeSidePanel() {
	document.getElementById("sidepanel-items").style.width = "0";
}

function renderSidePanel() {
	const root = document.getElementById("root");

	root.innerHTML = `
    <div id = "sidepanel-items" class = "sidepanel">
      <div id = "options">
        <a href = "javascript:void(0)" class = "sidepanel-close" onclick = "closeSidepanel()">&times;</a>
        <a onclick = "addNewSheetInput()">Add new Sheet</a>
        <a onclick = "renderSchemaInput()">Load from Schema Dump</a>
        <a onclick = "renderSQLInput()">Run SQL query</a>
      </div>
      <div id = "sheet-list"></div>
    </div>
    <div id = input-space>
      <div id = "sidepanel-btn">
  		    <button class = "sidepanel-open" onclick = "openSidePanel()">&#9776;</button>
      </div>
      <div id = "rest-all-input"></div>
    </div>
    <div id = "user-select"></div>
  `;

	openSidePanel();
}

const renderSheetsNames = () => {
	const sheetList = document.getElementById("sheet-list");
	//adding tables to sidePanel using anchor tag
	const result = db.exec("SELECT name FROM sqlite_master WHERE type='table';");
	//space to add sheets name
	sheetList.innerHTML = "";

	if (result[0]) {
		result[0].values.forEach((tablename, id) => {
			//listing table names
			const anch = document.createElement("a");
			anch.innerHTML = `${tablename[0]}`;
			anch.setAttribute("href", "#");
			anch.classList.add("anch");
			anch.addEventListener("click", (event) => {
				event.preventDefault();
				closeSidePanel();
				renderSheet(tablename[0]);
			});
			sheetList.appendChild(anch);
		});
	}
	openSidePanel();
};

//Initialize the database and render data
initializeDatabase().then(() => {
	return renderSidePanel();
});
