// Node Structures
function createColumnNode(colKey) {
	return {
		key: colKey,
		name: null,
		rows: null, // Secondary AVL Tree for columns
		left: null,
		right: null,
		height: 1,
	};
}

function createRowNode(rowKey, cellValue) {
	return {
		key: rowKey,
		value: cellValue,
		left: null,
		right: null,
		height: 1,
	};
}

// Utility Functions for AVL Tree Operations
function getHeight(node) {
	return node ? node.height : 0;
}

function getBalance(node) {
	return node ? getHeight(node.left) - getHeight(node.right) : 0;
}

function rotateRight(y) {
	const x = y.left;
	const T2 = x.right;

	x.right = y;
	y.left = T2;

	y.height = Math.max(getHeight(y.left), getHeight(y.right)) + 1;
	x.height = Math.max(getHeight(x.left), getHeight(x.right)) + 1;

	return x;
}

function rotateLeft(x) {
	const y = x.right;
	const T2 = y.left;

	y.left = x;
	x.right = T2;

	x.height = Math.max(getHeight(x.left), getHeight(x.right)) + 1;
	y.height = Math.max(getHeight(y.left), getHeight(y.right)) + 1;

	return y;
}

// Insert Column into Secondary Tree
function insertRow(node, rowKey, cellValue) {
	if (!node) return createRowNode(rowKey, cellValue);

	if (rowKey < node.key) {
		node.left = insertRow(node.left, rowKey, cellValue);
	} else if (rowKey > node.key) {
		node.right = insertRow(node.right, rowKey, cellValue);
	} else {
		// Update existing column value
		node.value = cellValue;
	}

	// Update height and balance the tree
	node.height = Math.max(getHeight(node.left), getHeight(node.right)) + 1;

	const balance = getBalance(node);

	// Balancing cases
	if (balance > 1 && rowKey < node.left.key) return rotateRight(node);
	if (balance < -1 && rowKey > node.right.key) return rotateLeft(node);
	if (balance > 1 && rowKey > node.left.key) {
		node.left = rotateLeft(node.left);
		return rotateRight(node);
	}
	if (balance < -1 && rowKey < node.right.key) {
		node.right = rotateRight(node.right);
		return rotateLeft(node);
	}

	return node;
}

// Insert Row into Primary Tree
function insertColumn(node, colKey) {
	if (!node) {
		const newCol = createColumnNode(colKey);
		return newCol;
	}

	if (colKey < node.key) {
		node.left = insertColumn(node.left, colKey);
	} else if (colKey > node.key) {
		node.right = insertColumn(node.right, colKey);
	}

	// Update height and balance the tree
	node.height = Math.max(getHeight(node.left), getHeight(node.right)) + 1;

	const balance = getBalance(node);

	// Balancing cases
	if (balance > 1 && colKey < node.left.key) return rotateRight(node);
	if (balance < -1 && colKey > node.right.key) return rotateLeft(node);
	if (balance > 1 && colKey > node.left.key) {
		node.left = rotateLeft(node.left);
		return rotateRight(node);
	}
	if (balance < -1 && colKey < node.right.key) {
		node.right = rotateRight(node.right);
		return rotateLeft(node);
	}

	return node;
}

// Add Column to a Row
function addRowToColumn(colNode, rowKey, cellValue) {
	if (!colNode.rows) {
		colNode.rows = createRowNode(rowKey, cellValue);
	} else {
		colNode.rows = insertRow(colNode.rows, rowKey, cellValue);
	}
}

// Search for a Row
function findRow(node, rowKey) {
	if (!node) return null;

	if (rowKey < node.key) return findRow(node.left, rowKey);
	if (rowKey > node.key) return findRow(node.right, rowKey);

	return node;
}

// Search for a Column in a Row
function findColumn(node, colKey) {
	if (!node) return null;

	if (colKey < node.key) return findColumn(node.left, colKey);
	if (colKey > node.key) return findColumn(node.right, colKey);

	return node;
}

// Insert Data into the AVL of AVL
function insertData(tree, rowKey, colKey, cellValue) {
	// Insert row if not already present
	const colNode = findColumn(tree, colKey);
	if (!colNode) {
		tree = insertColumn(tree, colKey);
	}

	// Insert column into the secondary tree for the row
	const updatedColumnNode = findColumn(tree, colKey);
	addRowToColumn(updatedColumnNode, rowKey, cellValue);

	return tree;
}

// Retrieve Data
function retrieveCellData(tree, rowKey, colKey) {
	const colNode = findColumn(tree, colKey);
	if (!colNode) return null;

	const rowNode = findRow(colNode.rows, rowKey);
	return rowNode ? rowNode.value : null;
}

// Traverse a Column's Rows
function traverseRows(node) {
	if (!node) return [];
	return [
		...traverseRows(node.left),
		{ key: node.key, value: node.value },
		...traverseRows(node.right),
	];
}

// Traverse All Rows and Columns
function traverseAll(tree) {
	if (!tree) return [];
	const left = traverseAll(tree.left);
	const current = {
		colKey: tree.key,
		rows: traverseRows(tree.rows),
	};
	const right = traverseAll(tree.right);
	return [...left, current, ...right];
}

let spreadsheet = {
	sheetName: null,
	rowCount: null,
	colCount: null,
	colRowTree: null,
};

// Insert rows and columns
// spreadsheet = insertData(spreadsheet, 1, 1, "Row 1, Column 1");
// spreadsheet = insertData(spreadsheet, 1, 2, "Row 1, Column 2");
// spreadsheet = insertData(spreadsheet, 2, 1, "Row 2, Column 1");
// spreadsheet = insertData(spreadsheet, 3, 1, "Row 3, Column 1");
// spreadsheet = insertData(spreadsheet, 3, 3, "Row 3, Column 3");

// Retrieve data
// console.log(retrieveData(spreadsheet, 1, 2)); // Output: "Row 1, Column 2"
// console.log(retrieveData(spreadsheet, 3, 3)); // Output: "Row 3, Column 3"

// Traverse all rows and columns
// console.log(spreadsheet);
