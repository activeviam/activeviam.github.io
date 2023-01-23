// / <reference types="cypress" />

describe("Load v1 inputs", () => {
  [
    "v1-retail.txt",
    "v1-no-space.txt",
    "v1-sample-1.txt",
    "v1-sample-2.txt",
    "v1-large-plan.txt",
    "v1-external-retrievals.txt"
  ].forEach(file => {
    it(`process ${file}`, () => {
      cy.visit("http://localhost:3000");

      cy.loadTextInput(file);

      cy.get('[type="radio"][value="V1"]').click();
      cy.get('[type="button"]').contains("Process").click();

      cy.contains("MDX pass Select");

      cy.contains("Graph").click();
      cy.contains("Menu");

      cy.contains("Timeline").click();
    });
  });
});
