//global variables
let db; // Global variable to hold the database instance
let tableno = 0;
let chunkSize = 50;

// Function to initialize the database
function initializeDatabase() {
	return initSqlJs().then((SQL) => {
		db = new SQL.Database();
		console.log("Database created");
	});
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

//this function displays UI for the schema input
function renderSchemaInput() {
	const space = document.getElementById("rest-all-input");
	space.innerHTML = "";
	space.innerHTML = `<input name="schema-input" type="file" onchange="loadSchema(event)" style="margin-left: 10px" />`;
	closeSidePanel();
}

//Renders query input elements
function renderSQLInput() {
	const space = document.getElementById("rest-all-input");
	space.innerHTML = "";
	space.innerHTML = `<textarea rows = "5" cols="40" id = "query-input" spellcheck="false" placeholder="Enter your query"></textarea>
			<button onclick = "runSQLQuery()">Submit</button>`;
	closeSidePanel();
}

//function to handle sqlfile
async function loadSchema(event) {
	const file = event.target.files[0];
	const buffer = await file.arrayBuffer();
	const SQL = await initSqlJs();
	db = new SQL.Database(new Uint8Array(buffer));
	renderSheetsNames();
	openSidePanel();
}

function runSQLQuery() {
	const query = document.getElementById("query-input").value;
	console.log(query);
	try {
		const res = db.exec(query);
		if (res[0]) {
			console.log(res);
			const output = document.getElementById("user-select");
			output.innerHTML = `
			<table border="1">
	            <thead>
              		<tr class = "table-header" id = "tmp_header"></tr>
            	</thead>
            	<tbody id="tmp-data-output" class = "table-body">
              		<!-- Dynamic rows will be added here -->
            	</tbody>
        	</table>`;
			const header = document.getElementById("tmp_header");
			const tbody = document.getElementById("tmp-data-output");
			const headrow = document.createElement("tr");
			res[0].columns.forEach((data, index) => {
				const hbody = document.createElement("td");
				hbody.innerHTML = data;
				headrow.appendChild(hbody);
			});
			header.appendChild(headrow);
			res[0].values.forEach((row, rowid) => {
				const bodyrow = document.createElement("tr");
				row.forEach((col, colid) => {
					const bodydata = document.createElement("td");
					bodydata.innerHTML = col;
					bodyrow.appendChild(bodydata);
				});
				tbody.appendChild(bodyrow);
			});
		}
	} catch (error) {
		alert("Error Executing Query");
		console.log(error);
	}
}

//creating sheet in db with user specified rows and columns
function renderNewSpreadsheet() {
	const rows = document.getElementById("rows").value;
	const columns = document.getElementById("columns").value % 26;
	const randomname = `untitled` + Math.floor(Math.random() * 100);
	let query = `CREATE TABLE ${randomname} (c0 INTEGER PRIMARY KEY`;

	//constructing query to create table
	for (let i = 1; i < columns; i++) {
		query += ` ,"c${i}" TEXT`;
		initSqlJs().then((SQL) => {});
	}
	query += `);`;

	//creating table
	try {
		db.run(query);
	} catch (error) {
		console.log("Error Creating new table");
	}
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
		try {
			db.run(query);
		} catch (error) {
			console.log("Error Inserting Data at iter: ", k);
			break;
		}
	}
	renderSheet(randomname);
}

function generateDBdump(event) {
	const dump = db.export();
	const dumpBlob = new Blob([dump], { type: "application/octet-stream" });
	const dumpUrl = URL.createObjectURL(dumpBlob);

	const a = document.createElement("a");
	a.href = dumpUrl;
	a.download = "database-dump.sql";
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

//generating and saving the dump for a table
function saveJson(event) {
	const res = db.exec(`SELECT * FROM ${event.target.name};`);
	const jsonData = JSON.stringify(res);
	const blob = new Blob([jsonData], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `${event.target.name}_data.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

//loading a tabledata from json
function loadJson(event) {
	const file = event.target.files[0];
	const result = db.exec(`SELECT MAX(c0) from ${event.target.name};`);
	let len = 1;
	if (result[0]) {
		len = result[0].values[0][0] - "0";
		len += 1;
	}
	const reader = new FileReader();
	reader.onload = (e) => {
		const res = JSON.parse(e.target.result);
		res[0].values.forEach((data) => {
			var query = `INSERT INTO ${event.target.name} VALUES (${len}`;
			data.forEach((value, id) => {
				if (id > 0) {
					query += `, `;
					query += `"${value}"`;
				}
			});
			len++;
			query += `);`;
			try {
				db.run(query);
			} catch (error) {
				alert("Error while inserting Data from file");
				// break;
			}
		});
		renderSheet(event.target.name);
	};
	reader.readAsText(file);
}

//loading the specified table(sheet)
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
          <button name="${sheetName}" onclick="generateDBdump(event)" style="margin-left: 10px">
              Generate DB dump
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
	closeSidePanel();
}

function handleInputChange(event, sheetName, row, col) {
	const value = event.target.value;
	db.run(`UPDATE ${sheetName} SET ${col} = "${value}" WHERE c0 = ${row};`);
}

function add(tablename, pagesRendered) {
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
        <a class = "sidepanel-close" onclick = "closeSidePanel()">&times;</a>
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
