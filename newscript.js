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

//renders input elements for input rows and columns
function addNewSheetInput() {
	const space = document.getElementById("rest-all-input");
	space.innerHTML = "";
	space.innerHTML = `
  		<div id="user-input">
    		<input type="number" id="user-rows" placeholder = "Enter number of rows"/>
    		<input type="number" id="user-columns" placeholder = "Enter number of columns (max 26)"/>
			<button onclick= "renderNewSpreadsheet()">Render Spreadsheet</button>
  		<div>`;
	closeSidePanel();
}

//this function displays UI for the schema input
function renderDbDumpInput() {
	const space = document.getElementById("rest-all-input");
	space.innerHTML = "";
	space.innerHTML = `<input name="db-dump-input" type="file" onchange="loadDbDump(event)" style="margin-left: 10px" />`;
	closeSidePanel();
}

//function to render input element for schema input
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

//function to handle database dump input
async function loadDbDump(event) {
	const file = event.target.files[0];
	const buffer = await file.arrayBuffer();
	const SQL = await initSqlJs();
	db = new SQL.Database(new Uint8Array(buffer));
	renderSheetsNames();
	openSidePanel();
}

//function to handle schema.sql file
function loadSchema(event) {
	const file = event.target.files[0];
	const reader = new FileReader();
	reader.readAsText(file);
	reader.onload = (e) => {
		try {
			db.run(e.target.result);
			renderSheetsNames();
			openSidePanel();
		} catch (error) {
			alert("Error in running the schema file");
			console.log(error);
		}
	};
}

//execute sql query input from user
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
	const rows = document.getElementById("user-rows").value;
	const columns = document.getElementById("user-columns").value % 26;
	const randomname = `untitled` + Math.floor(Math.random() * 100);
	let query = `CREATE TABLE ${randomname} (c0 INTEGER PRIMARY KEY`;

	//constructing query to create table
	for (let i = 1; i < columns; i++) {
		query += ` ,"c${i}" TEXT`;
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
	const result = db.exec(
		`SELECT cc.column_count, m.max_id from (SELECT MAX(id) as max_id from "${event.target.name}") m, (SELECT COUNT(*) as column_count from pragma_table_info("${event.target.name}")) cc;`
	);
	let len = 1;
	let db_col_count = 0;
	if (result[0]) {
		db_col_count = result[0].values[0][0];
		len = result[0].values[0][1] - "0";
		len += 1;
	}
	const reader = new FileReader();
	reader.readAsText(file);
	reader.onload = (e) => {
		const res = JSON.parse(e.target.result);
		if (db_col_count >= res[0].columns.length) {
			let colnames = `INSERT INTO ${event.target.name} (${res[0].columns[0]}`;
			res[0].columns.forEach((colname, colid) => {
				if (colid != 0) colnames += ` ,${colname}`;
			});
			colnames += ")";
			const file_row_count = res[0].values.length;
			for (let i = 0; i < file_row_count; i++) {
				let query = colnames + ` VALUES (${len}`;
				res[0].values[i].forEach((value, id) => {
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
					break;
				}
			}
			renderSheet(event.target.name);
		} else {
			const randomname = `untitled` + Math.floor(Math.random() * 100);
			query = `CREATE TABLE ${randomname} (c0 INTEGER PRIMARY KEY`;
			db_col_count = res[0].columns.length;
			//constructing query to create table
			for (let i = 1; i < db_col_count; i++) {
				query += ` ,"c${i}" TEXT`;
			}
			query += `);`;

			//creating table
			try {
				db.run(query);
			} catch (error) {
				console.log("Error Creating new table");
			}
			//inserting the data
			let colnames = `INSERT INTO ${randomname} (${res[0].columns[0]}`;
			res[0].columns.forEach((colname, colid) => {
				if (colid != 0) colnames += ` ,${colname}`;
			});
			colnames += ")";
			res[0].values.forEach((data) => {
				var query = colnames + ` VALUES (${len}`;
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
			renderSheet(randomname);
			renderSheetsNames();
		}
	};
}

//loading the specified table(sheet)
function renderSheet(sheetName) {
	let sheet_col_len = 0;
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
	if (result[0]) {
		result[0].columns.forEach((colname, index) => {
			const headerDesc = document.createElement("th");
			headerDesc.innerHTML = `${colname}`;

			const div = document.createElement("div");
			if (index != 0) {
				headerDesc.classList.add(`${colname}`);
				div.classList.add(`${colname}_resize`);
				div.classList.add(`resize`);
				headerDesc.appendChild(div);
			}

			tableHeader.appendChild(headerDesc);
		});

		//rendering rows and columns
		result[0].values.forEach((row, rowId) => {
			const tableRow = document.createElement("tr");
			row.forEach((col, colId) => {
				const tableCol = document.createElement("td");
				if (colId != 0) {
					tableCol.innerHTML = `
					<div class="container">
                		<input class="${result[0].columns[colId]}" type="text" name= "${sheetName}" oninput = "handleInputChange(event, ${row[0]}, '${result[0].columns[colId]}')" value = "${col}" />

                		<ul type = "none" id="${sheetName}-${result[0].columns[colId]}-dropdown" class="dropdown">
                  			<!-- List items will be dynamically inserted here -->
                		</ul>
              		</div>`;
					tableCol.classList.add(`${result[0].columns[colId]}`);
				} else {
					tableCol.innerHTML = `${col}`;
				}
				tableRow.appendChild(tableCol);
			});
			dataInput.appendChild(tableRow);
		});
		const divclass = document.querySelectorAll(".resize");
		divclass.forEach((resizer) => {
			resizer.addEventListener("mousedown", (e) => {
				const th = e.target.parentElement;
				const col_class = th.classList[0];
				const startWidth = th.offsetWidth;
				const startX = e.pageX;

				const onMouseMove = (e) => {
					const newWidth = startWidth + (e.pageX - startX);
					if (newWidth >= 50) {
						document.querySelectorAll(`.${col_class}`).forEach((resizer) => {
							if (resizer.nodeName == "INPUT") {
								resizer.style.width = `${newWidth - 3}px`;
							} else {
								resizer.style.width = `${newWidth}px`;
							}
						});
					}
				};

				const onMouseUp = () => {
					console.log("mouseup");
					document.removeEventListener("mousemove", onMouseMove);
					document.removeEventListener("mouseup", onMouseUp);
				};

				document.addEventListener("mousemove", onMouseMove);
				document.addEventListener("mouseup", onMouseUp);
			});
		});
	} else {
		result = db.exec(`PRAGMA table_info("${sheetName}");`);
		sheet_col_len = result[0].values.length;
		console.log(result);

		result[0].values.forEach((colname, index) => {
			const headerDesc = document.createElement("td");
			headerDesc.innerHTML = `${colname[1].toUpperCase()}`;
			tableHeader.appendChild(headerDesc);
		});
	}
	const restInput = document.getElementById("rest-all-input");
	restInput.innerHTML = `
		<div style="margin: 10px 0px; display:flex; flex-direction:row;	">
			<div>
				<input type = "number" id = "${sheetName}-row-input" placeholder= "Enter Row Count."/>
				<button onclick = "insertEmptyRows('${sheetName}', ${sheet_col_len})" style = "margin-left: 10px">Insert Empty Rows</button>
			</div>
          	<button name="${sheetName}" id ="${sheetName}-add" onclick = "add('${sheetName}')" style = "margin-left: 10px">Add ${sheetName}</button>
          	<button name="${sheetName}" onclick="saveJson(event)" style="margin-left: 10px">
              Save JSON
          	</button>
          	<input name="${sheetName}" type="file" id ="${sheetName}-loadjson" onchange = "loadJson(event)" style="margin-left: 10px" />
          	<button name="${sheetName}" onclick="generateDBdump(event)" style="margin-left: 10px">
              Generate DB dump
          	</button>
        </div>`;
	closeSidePanel();
	document.addEventListener("keydown", (e) => {
		const focused_element = document.activeElement;
		if (focused_element.tagName == "INPUT") {
			const cellIndex = focused_element.parentElement.parentElement.cellIndex;
			const rowIndex =
				focused_element.parentElement.parentElement.parentElement.rowIndex;
			const table = document.getElementById("user-select");
			const rows = table.firstElementChild.rows;
			switch (e.key) {
				case "ArrowUp":
					if (rowIndex > 1)
						rows[rowIndex - 1].cells[
							cellIndex
						].firstElementChild.firstElementChild.focus();
					break;
				case "ArrowDown":
					if (rowIndex < rows.length - 1)
						rows[rowIndex + 1].cells[
							cellIndex
						].firstElementChild.firstElementChild.focus();
					break;
				case "ArrowLeft":
					if (cellIndex > 1)
						rows[rowIndex].cells[
							cellIndex - 1
						].firstElementChild.firstElementChild.focus();
					break;
				case "ArrowRight":
					if (cellIndex < rows[rowIndex].cells.length - 1)
						rows[rowIndex].cells[
							cellIndex + 1
						].firstElementChild.firstElementChild.focus();
					break;
			}
		}
	});
}

function insertEmptyRows(sheetName, colCount) {
	const rows = document.getElementById(`${sheetName}-row-input`).value;
	const noOfIterations = Math.ceil(rows / chunkSize);
	let query = "";
	for (let k = 0; k < noOfIterations; k++) {
		const limit = Math.min(rows, (k + 1) * chunkSize - 1);
		const start = k * chunkSize;
		query = `INSERT INTO ${sheetName} values`;
		for (let i = start; i < limit; i++) {
			if (i != start) query += `, (${i}`;
			else query += ` (${i}`;
			for (let j = 1; j < colCount; j++) {
				query += ` ,""`;
			}
			query += `)`;
		}
		query += `;`;
		//insering empty rows
		try {
			db.run(query);
		} catch (error) {
			alert("Error Inserting Data at iter: ", k);
			console.log(error);
			break;
		}
	}
	renderSheet(sheetName);
}

//function to save the context on input
function handleInputChange(event, rowno, colname) {
	const { name, value } = event.target; //name represent sheetnames
	const result = db.exec(`PRAGMA foreign_key_list(${name});`);
	if (result[0]) {
		let tab = "";
		var relColumns = [];
		result[0].values.forEach((col, colId) => {
			if (col[3] == colname) {
				//col[3] represents colname of refereing table
				tab = col[2];
			}
		});
		if (tab != "") {
			result[0].values.forEach((col, colId) => {
				if (col[2] == tab && col[3] != colname) {
					relColumns.push(col[3]);
				}
			});
			var len = relColumns.length;
			var query1 = "";
			var result1;
			if (len > 0) {
				query1 = `select `;
				relColumns.forEach((data, id) => {
					if (id != len - 1) {
						query1 += `${data},`;
					} else {
						query1 += `${data} `;
					}
				});
				query1 += `from ${name} where id = ${rowno}`;
				result1 = db.exec(query1);
			}
			query1 = `SELECT distinct(${colname}) from ${tab} where`;
			if (result1) {
				len = result1[0].columns.length;
				result1[0].values[0].forEach((data, id) => {
					if (data != "") {
						query1 += ` ${result1[0].columns[id]} = "${data}" AND`;
					}
				});
			}
			query1 += ` ${colname} LIKE "%${value}%";`;
			result1 = db.exec(query1);
			const dropdown = document.getElementById(`${name}-${colname}-dropdown`);
			dropdown.style.display = "block";
			dropdown.innerHTML = "";
			if (result1[0]) {
				result1[0].values.forEach((data, id) => {
					const li = document.createElement("li");
					li.innerHTML = data;
					li.id = data;
					li.addEventListener("click", (e) => {
						dropdown.style.display = "none";
						(async () => {
							await db.run(
								`UPDATE ${name} SET ${colname} = "${e.target.id}" where id = ${rowno};`
							);
							renderSheet(name);
						})();
					});
					dropdown.appendChild(li);
				});
			}
		} else {
			db.run(`UPDATE ${name} SET ${colname} = "${value}" WHERE c0 = ${rowno};`);
		}
	} else {
		db.run(`UPDATE ${name} SET ${colname} = "${value}" WHERE c0 = ${rowno};`);
	}
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
        <a onclick = "renderDbDumpInput()">Load from Database Dump</a>
        <a onclick = "renderSchemaInput()">Load from Schema File</a>
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
