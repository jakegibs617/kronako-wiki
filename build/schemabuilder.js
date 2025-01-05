const tsj = require("ts-json-schema-generator");
const fs = require("fs");
const path = require("path");
const schemas = require("./schemas.json");

const relativePath = f => path.resolve(__dirname, "..", f);

const tsconfig = relativePath("tsconfig.json");

for (let { input, output, type } of schemas) {
    console.log("Generating schema for:", { input, output, type });
    const config = {
        path: relativePath(input),
        tsconfig,
        type
    };
    try {
        const schema = tsj.createGenerator(config).createSchema(config.type);
        const schemaString = JSON.stringify(schema, null, 2);
        console.log(`Writing schema to ${relativePath(output)}`);
        fs.writeFileSync(relativePath(output), schemaString);
    } catch (error) {
        console.error(`Error generating schema for ${type}:`, error);
    }
}
