// / <reference types="cypress" />

describe("Works with samples", () => {
  describe("support v1 inputs", () => {
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

  // ["larger-distributed-query.json"].forEach(file => {
  //   it(`process ${file}`, () => {
  //     cy.visit("http://localhost:3000");

  //     cy.fixture(`exports/${file}`).then(input => {
  //       cy.get("#query-input")
  //         .invoke("val", JSON.stringify(input))
  //         .trigger("change", { force: true });
  //     });

  //     // cy.get("#query-input").trigger("change");

  //     cy.contains("Import from Json").click();

  //     cy.contains("MDX pass Select");
  //   });
  // });
});
