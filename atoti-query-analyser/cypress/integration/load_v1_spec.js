// / <reference types="cypress" />

describe("Load v1 inputs", () => {
  ["v1-retail.txt"].forEach(file => {
    it(`process ${file}`, () => {
      cy.visit("http://localhost:3000");

      cy.fixture(`exports/${file}`).then(input => {
        cy.get("#query-input")
          .invoke("val", input)
          .trigger("change");
      });

      cy.contains("Import from V1").click();
      cy.contains("MDX pass Select");

      cy.contains("Graph").click();
      cy.contains("Menu");

      cy.contains("Timeline").click();
    });
  });
});
