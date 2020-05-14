// / <reference types="cypress" />

describe("Load v1 inputs", () => {
  [
    "v1-retail.txt",
    "v1-no-space.txt",
    "v1-sample-1.txt",
    "v1-sample-2.txt"
  ].forEach(file => {
    it(`process ${file}`, () => {
      cy.visit("http://localhost:3000");

      cy.loadTextInput(file);

      cy.contains("Import from V1").click();
      cy.contains("MDX pass Select");

      cy.contains("Graph").click();
      cy.contains("Menu");

      cy.contains("Timeline").click();
    });
  });
});
