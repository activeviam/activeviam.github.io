// / <reference types="cypress" />

describe("Works with JSON inputs", () => {
  ["larger-distributed-query.json", "larger-distribution-query2.json"].forEach(
    file => {
      it(`process ${file}`, () => {
        cy.visit("http://localhost:3000");

        cy.fixture(`exports/${file}`).then(input => {
          // Setting the content in two steps, as using val(..) then triggering changes was sometimes failing
          const content = JSON.stringify(input);
          cy.get("#query-input")
            .invoke("val", content.substring(0, content.length - 1))
            .trigger("change")
            .type(content[content.length - 1]);
        });

        cy.contains("Import from Json").click();

        cy.contains("MDX pass Select");
      });
    }
  );
});
