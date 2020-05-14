// / <reference types="cypress" />

describe("Works with JSON inputs", () => {
  ["larger-distributed-query.json", "larger-distribution-query2.json"].forEach(
    file => {
      it(`process ${file}`, () => {
        cy.visit("http://localhost:3000");

        cy.loadJsonInput(file);

        cy.contains("Import from Json").click();

        cy.contains("MDX pass Select");
      });
    }
  );
});
