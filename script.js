'use strict';

// Wrap everything in an anonymous function to avoid polluting the global namespace
(function () {
  // Event handlers for filter and parameter change
  let unregisterHandlerFunctions = [];

  // Use the jQuery document ready signal to know when everything has been initialized
  $(document).ready(function () {

    tableau.extensions.initializeAsync().then(function () {
      const dashboard = tableau.extensions.dashboardContent.dashboard;
      const container = document.getElementById('my-extension');

      const url = 'index.html';

      // Load the extension HTML content into the container using innerHTML
      fetch(url)
        .then(response => response.text())
        .then(html => {
          container.innerHTML = html;
        })
        .catch(error => console.error(error));

      // Get data from worksheet
      const worksheet = dashboard.worksheets[0];
      worksheet.getSummaryDataAsync().then((sumdata) => {
        const items = convertDataToItems(sumdata, false);

        // Render all items initially
        renderItems(items);

        // Listen for filter change
        unregisterHandlerFunctions.push(worksheet.addEventListener(tableau.TableauEventType.FilterChanged, function (filterEvent) {
          // Get filtered data
          worksheet.getSummaryDataAsync().then((sumdata) => {
            const items = convertDataToItems(sumdata, false);

            // Render filtered items
            renderItems(items);
          });
        }));
        tableau.extensions.dashboardContent.dashboard.getParametersAsync().then(function (parameters) {
          const pageNumberParameter = parameters.find(p => p.name === 'unique_ref');
          if (pageNumberParameter) {
            // Listen for changes to the Page Number parameter
            pageNumberParameter.addEventListener(tableau.TableauEventType.ParameterChanged, function (parameterChangedEvent) {
              parameterChangedEvent.getParameterAsync().then((parameter) => {
                const isDuplicated = parameter.currentValue.nativeValue;
                const worksheet = tableau.extensions.dashboardContent.dashboard.worksheets[0];
                worksheet.getSummaryDataAsync().then((sumdata) => {
                  const items = convertDataToItems(sumdata, isDuplicated);
  
                  // Render filtered items
                  renderItems(items);
                });
              })
            });
          };
        });
      });
    });
  });

  function duplicateObjects(list) {
    return list.reduce((acc, obj) => {


      const duplicatedObjects = Array.from({ length : obj.nb_colis < 1 ? 1 : obj.nb_colis}, () => ({
        ...obj
      }));

      return [...acc, ...duplicatedObjects];

    }, []);
  };

  /**
   * Converts summary data to items array.
   * @param {Tableau summary data} sumdata - The summary data to convert.
   * @returns {Array} The items array.
   */
  function convertDataToItems(sumdata, isDuplicated) {
    const { columns, data } = sumdata;
    const items = data.map((row) => {
      const item = {};
      for (let i = 0; i < columns.length; i++) {
        const field = columns[i].fieldName;
        item[field] = row[i].formattedValue;
      }
      console.log(item);
      return item;
    });

    if (!isDuplicated) {
      const duplicatedItems = duplicateObjects(items);
    
      return duplicatedItems;
    } else {
      return items;
    }

  }


  /**
   * Renders the items to the my-extension.html template.
   * @param {Array} items - The items to render.
   */
  function renderItems(items) {
    const container = document.createElement('div');
    container.className = 'container';

    items.forEach((item, index) => {
      const itemContainer = document.createElement('div');
      let itemClass = '';
      let itemContent = '';

      switch (item.model) {
        case 'Modèle AUC':
          itemClass = 'auchan';
          itemContent = `
          <div id="etiquette-auchan" >

            <div id="informations" >
                
                    <p id="reference" >${item.ref}</p>
                    <p id="title"  >${item.designation}</p>
                
                <p id="code" >Code Auchan <span>${item.tiers_ref}</span></p>
                <p id="nbrpieces" >${item.pcb}<span>pièces</span></p>
            </div>

            <div id="barcode" >
                <img   src="https://barcode.tec-it.com/barcode.ashx?data=${item.barcode1}&code=${item.barcode1_type}&multiplebarcodes=true" alt="Code-barres">
            </div>
          </div>
          `;
          break;

        case "Modèle ORC":
          let number = Number.parseFloat(item.weight.replace(",", ".")).toFixed(4);
          item.weight = number.toString();
          item.pcb = Number.parseInt(item.pcb);


          itemClass = 'orchestra';
          itemContent =`
        <div id="firstcont">

            <p style=" margin-top: 12.5mm;"><span
                    style=" font-size: 9pt; font-family: Arial, sans-serif;  font-weight: normal; margin-left: 6mm; margin-top: 12.5mm;">réf
                    client: </span> <span
                    style="font-size: 16px; font-family: Arial, sans-serif;  font-weight: normal; margin-left: 3.8mm; margin-top: 11mm;">${item.tiers_ref}</span>
            </p>
            <p style=" margin-top: 12.5mm;"><span
                    style="font-size: 9pt; font-family: Arial, sans-serif;  font-weight: normal; margin-left: 2.7mm; margin-top: 16mm;">Réf
                    fournisseur:</span> <span
                    style="font-size: 16px; font-family: Arial, sans-serif;  font-weight: normal; margin-left: 2.5mm; margin-top: 29.6mm;">${item.ref}</span></p>
            <div id="designation">
            <div style="font-size: 9pt; font-family: Arial, sans-serif;  font-weight: normal; margin-left: 4mm;">Désign</div>
                <div
                style="font-size: ${(item.designation.length < 16 ? "16pt" : "12pt")}; font-family: Arial, sans-serif;  font-weight: normal; margin-left: 4.2mm;">${item.designation}</div>
            </div>
            <p style=" margin-top: 12.5mm;"><span
                    style="font-size: 9pt; font-family: Arial, sans-serif;  font-weight: normal; margin-left: 6mm; margin-top: 74.7mm;">PCB</span>
                <span
                    style="font-size: 16px; font-family: Arial, sans-serif;  font-weight: normal; margin-left: 5mm; margin-top: 74.1mm;">${item.pcb}</span><span
                    style="font-size: 14px; font-family: Arial, sans-serif;  font-weight: normal; margin-left: 14.5mm; margin-top: 76.4mm;">
                    ${item.pcb === 1 ? "pièce" : "pièces"}
                </span></p>

        </div>

        <div id="secondcont">


            <p
                style="font-size: 11pt; font-family: Arial, sans-serif;  font-weight: normal; margin-left: 1mm; margin-top: 14.5mm; display: flex; flex-direction: column;">
                N° du bon de commande <span style="margin-left: 2mm; margin-top : 2mm;">${item.pi_no_tiers}</span></p>
            <p
                style="font-size: 12pt; font-family: Arial, sans-serif;  font-weight:bold ; margin-left: 1mm; margin-top: 8mm;">
                ORIGINE : <span
                    style="margin-top: 14.5mm;margin-left: 2.8mm;font-size: 16px; font-family: Arial, sans-serif;  font-weight: normal;">${item.origin_country}</span>
            </p>
            <p
                style="font-size: 11pt; font-family: Arial, sans-serif;  font-weight: normal; margin-left: 1mm; margin-top: 11.5mm; font-stretch: 119.5%;">
                poids du colis<span
                    style="margin-top: 11.5mm;margin-left: 3mm;font-size: 16px; font-family: Arial, sans-serif;  font-weight: normal;"> ${item.weight} </span><span
                    style="margin-top: 11.5mm;margin-left: 6.9mm;font-size: 16px; font-family: Arial, sans-serif;  font-weight: normal;">kg</span>
            </p>

            <div id="barcode-orchestra">
                <img style="width: 44.7mm; height: 34.7mm; margin-left: 8.4mm;" src="https://barcode.tec-it.com/barcode.ashx?data=${item.barcode1}&code=${item.barcode1_type}&multiplebarcodes=true&translate-esc=true&unit=Px&imagetype=Jpg&modulewidth=0.20&dpi=203&unit=Mm"
                    alt="Code-barres">
            </div>

        </div>`;
          break;

        case "Modèle AUB":
          itemClass = 'aubert';
          itemContent = `
    <div id="barcode" >
        <img style="width : 82mm; height : 18.6mm;" src="https://barcode.tec-it.com/barcode.ashx?data=${item.barcode1}&code=${item.barcode1_type}&multiplebarcodes=true&translate-esc=true&unit=Mm&modulewidth=0.5" alt="Code-barres">
    </div>
    `;
          break;
        
        case "Modèle OXY":
          itemClass = 'oxybul';
          itemContent = `
          <div id="templatefnaceveil" >
            <p style="font-size: 24.2pt; font-weight: normal; font-family: Arial, sans-serif;margin-top: 6mm; margin-left: 5.3mm;  ">EVEIL ET JEUX </p>
            <p class="my-class" style="margin-top:-8mm;">France</p>
            <P class="my-class" style="margin-top: 4mm;">NOM DU FOURNISSEUR :<span  style="margin-left: 6mm;">{{fournisseur}}</span></P>
            <p class="my-class" style="margin-top: 4mm;">reference fournisseur : <span style="margin-left:22.5mm;">700200</span></p>
            <P class="my-class" style="margin-top: -5mm;">reference fnac eveil & jeux  <span style="margin-left:17.3mm;">123456</span></P>
            <P class="my-class" style="margin-top: -1mm;">ean  :<span style="margin-left:6.7mm; ">{{ean}}</span></P>
            <P class="my-class"style="margin-top: -1mm;">LIBELLE PRODUIT: <span style="margin-left: 15.7mm;">{{libeleproduit}} </span></P>
            <p class="my-class" style="margin-top: -1mm;">nombre de pieces   <span style="margin-left:18.3mm;">{{nombredepieces}}</span></p>
            <P class="my-class" style="margin-left: 16.9mm; margin-top: -1mm;">poids du carton: <span style="margin-left:7mm;">{{poidsducarton}}</span></P>
            <p class="my-class" style="margin-left: 11mm; margin-top: -1mm;">dimension du carton:      <SPAN style="margin-left:13.3mm;">{{dimcarton}}</SPAN></p>
            <P class="my-class" style="margin-top: -4mm;">commande n°:     <span style="margin-left:16.6mm;">{{commandenum}}</span></P>
            <p class="my-class" style="min-width: max-content;">CARTON N° :     <span  style="margin-left: 13mm;">${index + 1}</span><span style="margin-left: 9.7mm;">partie de :</span> <span style="margin-left: 6mm;">${item.nb_colis_bp}</span> <span style="margin-left: 8.7mm;">colis</span> </p>
          </div>
          `;
          break;

        case "Modèle FNA":
          itemClass = 'fnac';
          itemContent = `
          <div id="etiquettefnac"  >
        

      
            <div id="partie-encadree"  >
            
              <img  style= "width: 29mm; height: 31mm; " src="./images/vulli_logo.jpg" \>
            
              <div id="informations" >
                  <p >VULLI S.A</p> 
                  <p >Z.I.Des Granges</p>
                  <p >74150 RUMILLY / FRANCE</p>
                  <p >Tél. +33(0)450010620</p>
              </div>
            
            </div>
      

            <div style="line-height: 2mm;font-size: 12pt; font-family: Arial, Helvetica, sans-serif; font-weight: normal;">
          
              <p style="margin-left:5mm ;margin-top: 3mm;">Fnac</p>
              <p style="margin-left: 5mm;">​</p>
              <p style="margin-left: 5mm;color:white;">​</p>
              <p style="margin-left:5mm ;">REF : ${item.ref}</p>
              <p style="margin-left: 5mm;color:white;">​</p>
              <p style="margin-left: 5mm;color:white;">​</p>
            </div>
          <p style="font-size: 12pt; font-family: Arial, Helvetica, sans-serif; font-weight: normal;margin-left: ${item.nb_colis_bp >= 100 ? '87mm;': '90mm;'} 90mm; margin-top: -6mm;">${index + 1}/${item.nb_colis_bp}</p>
      </div>
          
          `;
          break;

          case "Modèle MAN":
            itemClass = 'manual';
            itemContent = `<div class="subcontainer">
            <div class="informations">
                <p class="reference">Référence : ${item.reference}</p>
                <p class="designation">xxxx</p>
                <div style="display: flex; flex-direction: row;">
                    <p class="bn">BN: xxxxxx</p>
                    <p class="pcb">PCB: 1234</p>
                </div>
            </div>
            <div id="barcode">
                <img style="height: 33.5mm; width: 90mm;"
                  src="https://barcode.tec-it.com/barcode.ashx?data=011305656200318210013060&code=GS1-128&translate-esc=true"
                  alt="Code-barres">
              </div>
        </div>
    
        <div class="subcontainer">
            <div class="informations">
                <p class="reference">Référence : xxxx</p>
                <p class="designation">xxxx</p>
                <div style="display: flex; flex-direction: row;">
                    <p class="bn">BN: xxxxxx</p>
                    <p class="pcb">PCB: 1234</p>
                </div>
            </div>
            <div id="barcode">
                <img style="height: 33.5mm; width: 90mm;"
                  src="https://barcode.tec-it.com/barcode.ashx?data=011305656200318210013060&code=GS1-128&translate-esc=true"
                  alt="Code-barres">
            </div>
        </div>`;
        break;
      }

      itemContainer.className = `${itemClass} item`;
      itemContainer.innerHTML = itemContent;
      container.appendChild(itemContainer);
    });

    document.body.innerHTML = '';
    document.body.appendChild(container);

    // Add the print button
    const printButton = document.createElement('button');
    printButton.id = 'print-button';
    printButton.textContent = 'Imprimer';
    document.body.appendChild(printButton);
    printButton.addEventListener('click', function () {
      // Print the extension
      window.print();
    });
  }


})();