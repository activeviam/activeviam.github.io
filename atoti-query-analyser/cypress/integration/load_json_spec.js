// / <reference types="cypress" />

describe("Works with JSON inputs", () => {
  [
    "larger-distributed-query.json",
    "larger-distribution-query2.json",
    "query-with-external-retrievals.json",
    "range-location-path-plan.json",
    "no-data-key-format.json",
  ].forEach((file) => {
    it(`process ${file}`, () => {
      cy.visit("http://localhost:3000");

      cy.loadJsonInput(file);

      cy.get('[type="radio"][value="JSON"]').click();
      cy.get('[type="button"]').contains("Process").click();

      cy.contains("MDX pass Select");
    });
  });
});
