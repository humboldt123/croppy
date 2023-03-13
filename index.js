/**
 * Seam carve an image by a specified percentage amount and output the result to an HTML element
 *
 * @async
 * @param {number} amount - The percentage to narrow the image by
 * @param {string} source - The URL or of the source image
 * @param {string} output - The ID of the HTML element to output the result to.
 * @returns {Promise<void>} - Resolved when the carving is complete
 */
async function carve(source, amount, output) {
    let image = await IJS.Image.load(source);
    var result = image;
    for (let i = 0; i < image.width*(amount/100); i++) {
        document.getElementById(output).src = result.toDataURL();
        document.getElementById('progress').style.width = `${((i+1)*100)/(image.width*(amount/100))}%`;
        await new Promise(resolve => setTimeout(resolve, 10)); // 10 ms timeout to force it to render
        result = carveSeam(result);
    }
    document.getElementById(output).src = result.toDataURL();
}

/**
 * Returns the given image with one seam carved through it
 * 
 * @param {IJS.Image} image - Image to carve
 * @returns {IJS.Image} - Carved image
 */
function carveSeam(image) {
    let energyMap = getEnergyMatrix(image); // apply sobel filter and get image as matrix
    let path = pathfind(energyMap); // get awesome path through image

    // carve path through image
    let newData = Array.from(image.data);
    for (let i = path.length - 1; i >= 0; i--) {
        let coords = path[i];
        let vOffset = coords[0] * image.width * 4;
        let hOffset = coords[1] * 4;
        let offset = vOffset + hOffset;
        newData.splice(offset, 4);
    }

    // apply data and metadata changes
    image.data = newData;
    image.width = image.width - 1;

    return image;
}

/**
 * Returns a 2D Array for the pixels of the provided image's energy values
 * 
 * @param {IJS.Image} image - The image to get the energy matrix for
 * @returns {Array<Array<number>>} - The image as a matrix with its energy values added up
 */
function getEnergyMatrix(image) {
    let sobelData = image.sobelFilter().data; // apply sobel filter
    let matrix = Array(image.height).fill(null).map(() => Array(image.width).fill(0));
    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            let vOffset = y * image.width * 4;
            let hOffset = x * 4;
            let offset = vOffset + hOffset;

            // add up energy values
            matrix[y][x] = sobelData[offset] + sobelData[offset + 1] + sobelData[offset + 2];
        }
    }

    return matrix;
}

/**
 * Finds the lowest energy path through an energy matrix using Dijkstra's algorithm
 * 
 * @param {Array<Array<number>>} matrix - The energy matrix to find the path through
 * @returns {Array<Array<number>>} - The path through the matrix with the lowest energy values 
 */
function pathfind(matrix) {
    // Further readinmg: https://en.wikipedia.org/wiki/Dijkstra's_algorithm

    let rows = matrix.length;
    let cols = matrix[0].length;

    // Initialize the distance, visited, and previous arrays
    let distances = [...Array(rows)].map(() => [...Array(cols)].fill(Infinity));
    let visited = [...Array(rows)].map(() => [...Array(cols)].fill(false));
    let previous = [...Array(rows)].map(() => [...Array(cols)].fill(null));

    // Start at the center of the top row
    let startRow = 0;
    let startCol = Math.floor(cols / 2);
    distances[startRow][startCol] = matrix[startRow][startCol];
    let queue = [{row: startRow,col: startCol,distance: matrix[startRow][startCol]}];

    while (queue.length) {
        // Sort the queue by distance so we visit the closest node first
        queue.sort((a, b) => a.distance - b.distance);
        let {row,col,distance} = queue.shift();

        if (visited[row][col]) continue;
        visited[row][col] = true;

        if (row === rows - 1) {
            // Build the path by tracing back through the previous cells
            let path = [[row, col]];
            let current = previous[row][col];
            while (current) {
                path.unshift([current.row, current.col]);
                current = previous[current.row][current.col];
            }
            return path;
        }

        for (let j = -1; j <= 1; j++) {
            if (j === 0) continue;
            let newRow = row + 1; // Every step our path takes must move us down by one
            let newCol = col + j;

            if (newRow < 0 || newRow >= rows || newCol < 0 || newCol >= cols) continue;
            let newDistance = distance + matrix[newRow][newCol];

            if (newDistance < distances[newRow][newCol]) {
                distances[newRow][newCol] = newDistance;
                previous[newRow][newCol] = {row,col};
                queue.push({row: newRow, col: newCol, distance: newDistance});
            }
        }
    }
}

function uploadImage(event) {
    const file = event.target.files[0];
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => carve(reader.result, document.getElementById("amount").value, "result");
    } else alert('Plase select a .jpeg or .jpg');
}
