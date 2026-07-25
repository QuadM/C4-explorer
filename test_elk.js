const ELK = require("elkjs/lib/elk.bundled.js");
const elk = new ELK();

async function run() {
  const root = {
    id: "root",
    children: [
      {
        id: "parent",
        children: [
          { id: "c1", width: 260, height: 120 },
          { id: "c2", width: 260, height: 120 }
        ],
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": "RIGHT",
          "elk.padding": "[top=56,left=36,bottom=36,right=36]"
        }
      }
    ]
  };
  
  const layout = await elk.layout(root);
  console.log(JSON.stringify(layout.children[0], null, 2));
}
run();
