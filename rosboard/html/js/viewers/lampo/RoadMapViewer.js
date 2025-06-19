"use strict";

/**
 * @fileoverview RoadMapViewer class for RosBoard, extending Space2DViewer.
 * This class visualizes road network data on a 2D canvas,
 * including a grid and road segments based on bitmask values.
 */

// Define bitmasks for road directions. These are internal constants for the class.
const DIRECTION_NORTH = 0b0001; // 1
const DIRECTION_EAST = 0b0010;  // 2
const DIRECTION_SOUTH = 0b0100; // 4
const DIRECTION_WEST = 0b1000;  // 8

/**
 * @class RoadMapViewer
 * @extends Space2DViewer
 * @description A RosBoard viewer extension for visualizing road map data.
 * It expects data messages in the following format (e.g., from a custom ROS message type):
 * {
 * height: number, // Total height of the map in world units (e.g., meters)
 * width: number,  // Total width of the map in world units (e.g., meters)
 * tiles_y: number, // Number of tiles in the Y (vertical) direction
 * tiles_x: number, // Number of tiles in the X (horizontal) direction
 * roads: number[]  // An array of uint8 values (0-255), where each value
 * // is a bitmask representing road directions for one tile.
 * // The array length should be tiles_y * tiles_x.
 * }
 *
 * The bitmask interpretation for 'roads' is:
 * - 0b0001 (1): North road is present
 * - 0b0010 (2): East road is present
 * - 0b0100 (4): South road is present
 * - 0b1000 (8): West road is present
 */
class RoadMapViewer extends Space2DViewer {
    /**
     * The `onCreate` method is inherited from Space2DViewer and is where the
     * canvas and its context are set up. We don't need to override it here.
     */

    /**
     * This method is called by RosBoard when a new message for this viewer's
     * subscribed topic type arrives.
     * @param {Object} msg - The incoming ROS message containing map data.
     */
    onData(msg) {
        // You can update the card title to show the topic name or other info
        this.card.title.text(msg._topic_name || "Road Map");

        // Use the incoming message directly as your map data
        this.processMapData(msg);
    }

    /**
     * Processes the raw map data message and prepares drawing objects for Space2DViewer.
     * @param {Object} mapData - The map data message.
     * @param {number} mapData.height - The total height of the map in world units.
     * @param {number} mapData.width - The total width of the map in world units.
     * @param {number} mapData.tiles_y - The number of tiles in the Y direction.
     * @param {number} mapData.tiles_x - The number of tiles in the X direction.
     * @param {number[]} mapData.roads - An array of uint8 values representing road directions for each tile.
     */
    processMapData(mapData) {
        const drawObjects = [];

        // If no data or if the 'roads' array is missing/empty, there's nothing specific to draw.
        if (!mapData || !mapData.roads || mapData.roads.length === 0) {
            // Call super.draw with an empty array to clear any previous map drawings.
            this.draw(drawObjects);
            return;
        }

        const { height, width, tiles_y, tiles_x, roads } = mapData;

        // Calculate the dimensions of each individual tile in world units.
        const tileWidth = width / tiles_x;
        const tileHeight = height / tiles_y;

        // Determine the current scaling factor of the Space2DViewer's world units to its internal virtual pixels.
        // This is crucial for drawing lines that maintain consistent visual thickness at different zoom levels.
        // (this.xmax - this.xmin) is the current width of the view in world units (meters).
        // this.size is the fixed virtual pixel size of the Space2DViewer's canvas (e.g., 500).
        const worldUnitsPerVirtualPixel = (this.xmax - this.xmin) / this.size;

        // Desired screen pixel thickness for grid lines, converted to world units.
        const desiredGridPixelWidth = 1.0; // 1 pixel visually
        const gridLineWidth = desiredGridPixelWidth * worldUnitsPerVirtualPixel;

        // Desired screen pixel thickness for road lines, converted to world units.
        const desiredRoadPixelWidth = 3.0; // 3 pixels visually
        const roadLineWidth = desiredRoadPixelWidth * worldUnitsPerVirtualPixel;

        // --- Add Grid Lines (Tile Boundaries) to drawObjects ---
        for (let i = 0; i <= tiles_x; i++) {
            const mapX = i * tileWidth; // X-coordinate of vertical line in map's top-left origin system

            // Convert map coordinates to Space2DViewer's world coordinates (center origin, Y-up).
            const sX = mapX - width / 2;
            const sY_start = -(0 - height / 2);      // Top edge of the map
            const sY_end = -(height - height / 2);    // Bottom edge of the map

            drawObjects.push({
                type: "path",
                data: [sX, sY_start, sX, sY_end],
                lineWidth: gridLineWidth,
                color: "#334155" // Light grey for grid lines
            });
        }

        for (let i = 0; i <= tiles_y; i++) {
            const mapY = i * tileHeight; // Y-coordinate of horizontal line in map's top-left origin system

            // Convert map coordinates to Space2DViewer's world coordinates.
            const sX_start = 0 - width / 2;         // Left edge of the map
            const sX_end = width - width / 2;       // Right edge of the map
            const sY = -(mapY - height / 2);         // Y-coordinate in Space2DViewer's Y-up system

            drawObjects.push({
                type: "path",
                data: [sX_start, sY, sX_end, sY],
                lineWidth: gridLineWidth,
                color: "#334155"
            });
        }

        // --- Add Roads to drawObjects ---
        // Calculate the center point within a single tile in map's relative coordinates.
        const tileMidX = tileWidth / 2;
        const tileMidY = tileHeight / 2;

        // Iterate through each tile to add its specific roads.
        for (let y = 0; y < tiles_y; y++) {
            for (let x = 0; x < tiles_x; x++) {
                const tileIndex = y * tiles_x + x;
                const roadMask = roads[tileIndex];

                if (roadMask === undefined) {
                    console.warn(`Road data missing for tile at (${x}, ${y}). Index: ${tileIndex}.`);
                    continue;
                }

                // Calculate the top-left map coordinates of the current tile.
                const tileMapGlobalX = x * tileWidth;
                const tileMapGlobalY = y * tileHeight;

                // Calculate the center of the current tile in map's global coordinates.
                const centerMapX = tileMapGlobalX + tileMidX;
                const centerMapY = tileMapGlobalY + tileMidY;

                // Convert tile center to Space2DViewer's world coordinates.
                const centerSX = centerMapX - width / 2;
                const centerSY = -(centerMapY - height / 2); // Flip Y-axis

                // Check each bit in the `roadMask` to determine which road segments to add.
                // Each segment connects the tile center to the midpoint of its respective edge.

                // North road: connect tile center to the top edge's midpoint.
                if ((roadMask & DIRECTION_NORTH) !== 0) {
                    const endMapX = tileMapGlobalX + tileMidX;
                    const endMapY = tileMapGlobalY; // Top edge Y
                    drawObjects.push({
                        type: "path",
                        data: [centerSX, centerSY, endMapX - width / 2, -(endMapY - height / 2)],
                        lineWidth: roadLineWidth,
                        color: "#cbd5e1" // Dark grey for roads
                    });
                }
                // East road: connect tile center to the right edge's midpoint.
                if ((roadMask & DIRECTION_EAST) !== 0) {
                    const endMapX = tileMapGlobalX + tileWidth; // Right edge X
                    const endMapY = tileMapGlobalY + tileMidY;
                    drawObjects.push({
                        type: "path",
                        data: [centerSX, centerSY, endMapX - width / 2, -(endMapY - height / 2)],
                        lineWidth: roadLineWidth,
                        color: "#cbd5e1"
                    });
                }
                // South road: connect tile center to the bottom edge's midpoint.
                if ((roadMask & DIRECTION_SOUTH) !== 0) {
                    const endMapX = tileMapGlobalX + tileMidX;
                    const endMapY = tileMapGlobalY + tileHeight; // Bottom edge Y
                    drawObjects.push({
                        type: "path",
                        data: [centerSX, centerSY, endMapX - width / 2, -(endMapY - height / 2)],
                        lineWidth: roadLineWidth,
                        color: "#cbd5e1"
                    });
                }
                // West road: connect tile center to the left edge's midpoint.
                if ((roadMask & DIRECTION_WEST) !== 0) {
                    const endMapX = tileMapGlobalX; // Left edge X
                    const endMapY = tileMapGlobalY + tileMidY;
                    drawObjects.push({
                        type: "path",
                        data: [centerSX, centerSY, endMapX - width / 2, -(endMapY - height / 2)],
                        lineWidth: roadLineWidth,
                        color: "#cbd5e1"
                    });
                }
            }
        }

        // Set the default view if needed, for instance, to center on the map.
        // This makes sure the map is visible when the viewer first opens or if it's reset.
        // 'scale' defines the total span of the view (e.g., 40.0 meters).
        // Since our map is `width` and `height`, we can set the scale to fit the larger dimension.
        const defaultViewScale = Math.max(width, height) * 1.2; // Add some padding
        this.setDefaultView({xcenter: 0, ycenter: 0, scale: defaultViewScale}); // Center on (0,0) of the map

        // Finally, pass the array of generated drawing objects to the base Space2DViewer's draw function.
        // Space2DViewer will handle clearing the canvas and applying its own transformations
        // before iterating through these drawObjects and rendering them.
        this.draw(drawObjects);
    }
}

RoadMapViewer.friendlyName = "Road Map Viewer";

RoadMapViewer.supportedTypes = [
    "lampo_interfaces/msg/Map",
];

Viewer.registerViewer(RoadMapViewer);