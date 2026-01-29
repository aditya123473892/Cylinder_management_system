const sql = require("mssql");
const { connectDB } = require("../apps/backend/src/shared/config/database");

async function initializeInventory() {
  try {
    const pool = await connectDB();
    console.log("Connected to database");

    // Check if cylinder types exist
    const cylinderTypes = await pool
      .request()
      .query("SELECT CylinderTypeId, Capacity FROM CYLINDER_TYPE_MASTER");
    console.log("Cylinder types found:", cylinderTypes.recordset.length);

    if (cylinderTypes.recordset.length === 0) {
      console.log(
        "No cylinder types found. Please create cylinder types first."
      );
      return;
    }

    // Initialize inventory for each cylinder type in YARD
    for (const cylinderType of cylinderTypes.recordset) {
      const existingInventory = await pool
        .request()
        .input("cylinderTypeId", sql.Int, cylinderType.CylinderTypeId)
        .query(
          "SELECT * FROM CYLINDER_LOCATION_INVENTORY WHERE cylinder_type_id = @cylinderTypeId AND location_type = 'YARD'"
        );

      if (existingInventory.recordset.length === 0) {
        await pool
          .request()
          .input("cylinderTypeId", sql.Int, cylinderType.CylinderTypeId)
          .input("quantity", sql.Int, 100)
          .input("updatedBy", sql.Int, 1).query(`
            INSERT INTO CYLINDER_LOCATION_INVENTORY (
              cylinder_type_id, location_type, quantity, updated_by
            ) VALUES (@cylinderTypeId, 'YARD', @quantity, @updatedBy)
          `);

        console.log(
          `Initialized 100 x ${cylinderType.Capacity} cylinders in YARD`
        );
      } else {
        console.log(
          `Inventory already exists for ${cylinderType.Capacity} cylinders`
        );
      }
    }

    console.log("Inventory initialization completed successfully");

    // Verify the initialization
    const inventorySummary = await pool.request().query(`
      SELECT
        ctm.Capacity as cylinder_capacity,
        cli.location_type,
        cli.quantity
      FROM CYLINDER_LOCATION_INVENTORY cli
      JOIN CYLINDER_TYPE_MASTER ctm ON cli.cylinder_type_id = ctm.CylinderTypeId
      ORDER BY ctm.Capacity, cli.location_type
    `);

    console.log("Current inventory:");
    inventorySummary.recordset.forEach((item) => {
      console.log(
        `  ${item.cylinder_capacity}: ${item.quantity} in ${item.location_type}`
      );
    });

    process.exit(0);
  } catch (error) {
    console.error("Error initializing inventory:", error);
    process.exit(1);
  }
}

initializeInventory();
