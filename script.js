'use strict';

// Wrap everything in an anonymous function to avoid polluting the global namespace
(function () {
  // Event handlers for filter and parameter change
  let unregisterHandlerFunctions = [];

  // Use the jQuery document ready signal to know when everything has been initialized
  $(document).ready(function () {

    console.log("Test changement de déploiement")

    tableau.extensions.initializeAsync().then(function () {

      const container = document.getElementById('my-extension');

      let extensionName = ["manuel_ref", "manuel_bn"];
      
      let extensionVisibilityObject = {};

      const url = 'index.html';

      // Load the extension HTML content into the container using innerHTML
      fetch(url)
        .then(response => response.text())
        .then(html => {
          container.innerHTML = html;
        })
        .catch(error => console.error(error));

        let worksheet = tableau.extensions.dashboardContent.dashboard.worksheets[0];

        unregisterHandlerFunctions.push(worksheet.addEventListener(tableau.TableauEventType.FilterChanged, function (filterEvent) {
          // Get filtered data
          worksheet.getSummaryDataAsync().then((sumdata) => {
            const items = convertDataToItems(sumdata, false);

            // Render filtered items
            renderItems(items);
          });
        }));

        tableau.extensions.dashboardContent.dashboard.getParametersAsync().then((parameters) => {
          console.log("Afficher tout les paramètres : ", parameters);
          const entryTypeParameter = parameters.find(p => p.name === 'type_entree');
          const pageNumberParameter = parameters.find(p => p.name === "unique_ref");
          const manualBNParameter = parameters.find(p => p.name === "manuel_bn");
          const manualReferenceParameter = parameters.find(p => p.name === "manuel_ref");

          tableau.extensions.dashboardContent.dashboard.worksheets[0].getSummaryDataAsync().then((sumdata) => {
            console.log("=> Initialisation de l'affichage");
            const items = convertDataToItems(sumdata, false);
  
            // Render filtered items
            renderItems(items);
          });

          if (pageNumberParameter) {
            // Listen for changes to the Page Number parameter
            pageNumberParameter.addEventListener(tableau.TableauEventType.ParameterChanged, function (parameterChangedEvent) {
              parameterChangedEvent.getParameterAsync().then((parameter) => {
                const isDuplicated = parameter.currentValue.nativeValue;
                worksheet.getSummaryDataAsync().then((sumdata) => {
                  console.log("=> Récupération 'Voir étiquette unique'");
                  const items = convertDataToItems(sumdata, isDuplicated);
  
                  // Render filtered items
                  renderItems(items);
                });
              })
            });
          };

          if (entryTypeParameter) {
            entryTypeParameter.addEventListener(tableau.TableauEventType.ParameterChanged, (parameterChangedEvent) => {
              parameterChangedEvent.getParameterAsync().then((parameter) => {
                const entryTypeValue = parameter.currentValue.nativeValue;
                if(entryTypeValue === "Manuel"){
                    worksheet = tableau.extensions.dashboardContent.dashboard.worksheets[1];
                    tableau.extensions.dashboardContent.dashboard.objects.forEach((object) => {
                      if(extensionName.includes(object.name)){
                        extensionVisibilityObject[object.id] = tableau.ZoneVisibilityType.Show;
                      }
                    });
                    tableau.extensions.dashboardContent.dashboard.setZoneVisibilityAsync(extensionVisibilityObject).then(() => {
                      console.log("Show Elements");
                    })
                    worksheet.getSummaryDataAsync().then((sumdata) => {
                      const items = convertDataToItems(sumdata, true);
              
                      renderItems(items);
              
                    });
                } else if (entryTypeValue === "Course") {
                    worksheet = tableau.extensions.dashboardContent.dashboard.worksheets[0];
                    tableau.extensions.dashboardContent.dashboard.objects.forEach((object) => {
                      if(extensionName.includes(object.name)){
                        extensionVisibilityObject[object.id] = tableau.ZoneVisibilityType.Hide
                      }
                    });
                    tableau.extensions.dashboardContent.dashboard.setZoneVisibilityAsync(extensionVisibilityObject).then(() => {
                      console.log("Hide Elements");
                    })
                    worksheet.getSummaryDataAsync().then((sumdata) => {
                      const items = convertDataToItems(sumdata, true);
              
                      // Render all items initially
                      renderItems(items);
              
                    });
                }
                
              })
            })
          };

          if (manualBNParameter) {
            manualBNParameter.addEventListener(tableau.TableauEventType.ParameterChanged, (parameterChangedEvent) => {
              parameterChangedEvent.getParameterAsync().then(() => {
                worksheet.getSummaryDataAsync().then((sumdata) => {
                  const items = convertDataToItems(sumdata, true);
          
                  // Render all items initially
                  renderItems(items);
                });
              })
            })};

          if (manualReferenceParameter) {
            manualReferenceParameter.addEventListener(tableau.TableauEventType.ParameterChanged, (parameterChangedEvent) => {
              parameterChangedEvent.getParameterAsync().then(() => {
                worksheet.getSummaryDataAsync().then((sumdata) => {
                  const items = convertDataToItems(sumdata, true);
          
                  // Render all items initially
                  renderItems(items);
          
                });
              })
            })
          };
        });
    });
  });

  /**
   * Display duplicated items.
   * @param {Tableau summary data} list - 
   */
  function duplicateObjects(list) {
    return list.reduce((acc, obj) => {

      const duplicatedObjects = Array.from({ length : obj.nb_colis_or_man < 1 ? 1 : obj.nb_colis_or_man}, () => ({
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
    console.log("Columns : ", columns);
    console.log("Data : ", data);
    const items = data.map((row) => {
      const item = {};
      for (let i = 0; i < columns.length; i++) {
        const field = columns[i].fieldName;
        item[field] = row[i].formattedValue;
      }
      console.log("Item : ", item)
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

    console.log("Items : ", items);

    items.forEach((item, index) => {
      const itemContainer = document.createElement('div');
      let itemClass = '';
      let itemContent = '';

      switch (item.model_or_man) {
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
            <P class="my-class" style="margin-top: 4mm;">NOM DU FOURNISSEUR :<span  style="margin-left: 6mm;">${item.ref}</span></P>
            <p class="my-class" style="margin-top: 3mm;">reference fournisseur : <span style="margin-left:22.5mm;">${item.tiers_ref}</span></p>
            <P class="my-class" style="margin-top: -5mm;">reference fnac eveil & jeux  <span style="margin-left:17.3mm;">xxxxxxxx</span></P>
            <P class="my-class" style="margin-top: -1mm;">ean  :<span style="margin-left:6.7mm; ">${item.EAN13}</span></P>
            <P class="my-class"style="margin-top: -1mm;">LIBELLE PRODUIT: <span style="margin-left: 15.7mm;">${item.designation} </span></P>
            <p class="my-class" style="margin-top: -1mm;">nombre de pieces   <span style="margin-left:18.3mm;">${item.nb_colis_bp}</span></p>
            <P class="my-class" style="margin-left: 4.899999999999999mmmm; margin-top: -1mm;">poids du carton: <span style="margin-left:7mm;">${item.weight}</span></P>
            <p class="my-class" style="margin-left: 5mm; margin-top: -3mm;">dimension du carton:      <SPAN style="margin-left:13.3mm;">xxxxx</SPAN></p>
            <P class="my-class" style="margin-top: -4mm;">commande n°:     <span style="margin-left:16.6mm;">${item.pi_no_tiers}</span></P>
            <p class="my-class" style="min-width: max-content;margin-top: -3mm;">CARTON N° :     <span  style="margin-left: 13mm;">${index + 1}</span><span style="margin-left: 9.7mm;">partie de :</span> <span style="margin-left: 6mm;">${item.nb_colis_bp}</span> <span style="margin-left: 8.7mm;">colis</span> </p>
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
                <p class="reference">Référence : ${item.Reference}</p>
                <p class="designation">${item.designation}</p>
                <div style="display: flex; flex-direction: row;">
                    <p class="bn">BN: ${item.manuel_bn}</p>
                    <p class="pcb">PCB: ${item.pcb}</p>
                </div>
            </div>
            <div id="barcode">
                <img style="height: 33.5mm; width: 90mm;"
                  src="https://barcode.tec-it.com/barcode.ashx?data=${item.barcode_manuel}&code=GS1-128&translate-esc=true"
                  alt="Code-barres">
              </div>
        </div>
    
        <div class="subcontainer">
            <div class="informations">
                <p class="reference">Référence : ${item.Reference}</p>
                <p class="designation">${item.designation}</p>
                <div style="display: flex; flex-direction: row;">
                    <p class="bn">BN: ${item.manuel_bn}</p>
                    <p class="pcb">PCB: ${item.pcb}</p>
                </div>
            </div>
            <div id="barcode">
                <img style="height: 33.5mm; width: 90mm;"
                  src="https://barcode.tec-it.com/barcode.ashx?data=${item.barcode_manuel}&code=GS1-128&translate-esc=true"
                  alt="Code-barres">
            </div>
        </div>`;
        break;
        case "Modèle SMAL":
          itemClass = 'smallable';
          itemContent = `
          <p id="smallable"> smallable </p>
          <p style="font-weight: 700;font-size: larger; ">COLIS n° <span style="margin-left:20px;">${index + 1}</span><span style="margin-left:20px;">Sur <span style="margin-left:10px;">${index + 1}/${item.nb_colis_bp}</span>
          </p>  
          `;
          break;
        case "Modèle VERB":
            itemClass = 'verbaudet';
            itemContent = `
            <div id="etiquetteverbaudet">
            <div id="exp-desti">
                <div style="margin-left: 30px;">
                    <div style="line-height : 15px;">
                        <p >Expéditeur:</p>
                        <p>VULLI SAS</p>
                    </div>
                    <div style="line-height : 5px;">
                        <p>1 avenue des alpes</p>
                        <p>74150 RUMILLY</p>
                    </div>
                </div>
                <div style="margin-left: 100px; border-left: 2px solid black;">
                    <div style="line-height : 15px;">
                        <p style="margin-left: 70px;">Destinataire:</p>
    
                        <p style="margin-left: 70px;">VERTBAUDET</p>
                    </div>
                    <div style="line-height : 5px;">
                        <p style="margin-left: 70px;">12/14 Avenue industrielle</p>
                        <p style="margin-left: 70px;">59520 MARQUETTE LEZ</p>
                        <p style="margin-left: 70px;">LILLE</p>
                    </div>
                </div>
    
            </div>
        </div>
        <div id="contttwo">
    
            <div id="num-colis">
                <p>${index + 1}</p>
    
                <p style="align-content: center;margin-left: 50px;">1</p>
    
                <p>${item.nb_colis_bp}</p>
                <p style="align-content: center;margin-left: 50px;">1</p>
    
    
    
    
            </div>
    
            <div id="ref-refproduit">
                <p style="font-size:x-large;">Réf . reference produit  <span style="margin-left: 10px">${item.ref}</span></p>
                <div id="barcode" style="display: flex; align-items: center;">
                    <img src="https://barcode.tec-it.com/barcode.ashx?data=${item.barcode1}&code=${item.EAN13}&translate-esc=true&imagetype=Svg&rotation=0" alt="Code-barres">
                </div>
    
            </div>
    
            <div id="date-envoi">
                <p style="margin-left: 17px;">Date d'envoie </p>
    
                <p style="align-content: center;margin-left: 17px;">27/03/2019</p>
                <div style="line-height:70px";>
                <hr style="color: black;">
            
               
                <p style="margin-left: 17px;">${item.pi_no_tiers} Pièces</p>
    
            </div>
            </div>
    
    
    
        </div>
    
        </div>
        </div>
            `;
            break;
      case "Modèle PROD":
            itemClass = 'production';
            itemContent = `
            <div id="container">
              <div id="right">
               <div>Réference: ${item.tiers_ref}</div>
               <div>${item.manuel_bn}</div>
             <div>${item.pcb}</div>
             <div class="barcode">
              <img style="height: 34.7mm; margin-left: 8.4mm;"
             src="https://barcode.tec-it.com/barcode.ashx?data=${item.barcode1}&code=${item.barcode1_type}&multiplebarcodes=true&translate-esc=true&unit=Px&imagetype=Jpg&modulewidth=0.20&dpi=300&unit=Mm"
             alt="Code-barres">
             </div>
             </div>
             <div id="left">
             <div>Réference: ${item.tiers_ref}</div>
             <div>${item.manuel_bn}</div>
             <div>${item.pcb}</div>
             <div class="barcode">
             <img style="height: 34.7mm; margin-left: 8.4mm;"
             src="https://barcode.tec-it.com/barcode.ashx?data=${item.barcode1}&code=${item.barcode1_type}&multiplebarcodes=true&translate-esc=true&unit=Px&imagetype=Jpg&modulewidth=0.20&dpi=300&unit=Mm"
             alt="Code-barres">
             </div>
             </div>
              </div>
            `;
            break;
      case "Modèle SYS":
              itemClass = 'systemu';
              itemContent = `
              <div id="etiquettesystem" >
              <div id="firstrow">
                   <div >
                       <p><h7>Nom fournisseur</h7></p>
                       <p>VULLI </p>
                       <p>Z.I.</p>
                       <p>74150 RUMILLY</p>
           
                   </div>
                   
                   <div class="classborder"  >
                       <div style="margin-left: 5mm;">
                       <p>SYSTEM U </p>
                       <p>Vendèopôle-Haut bocage</p>
                       <p>Vendéen</p>
                       <p>Les champs de Ray </p>
                       <p>85500 LES HERBIERS</p>
                   </div>
               </div>
                   
               </div>
               <div id="secondrow">
                   <div id="firstcol">
                       <p >désign :<span style="font-size: x-large;margin-left: 10px;"><sup>${item.designation}</sup></span></p>
                       <p>Réf.fournisseur<span style="font-size: x-large;margin-left: 20px;">${item.Reference}</span></p>
                       <p>PCB<span style="margin-left: 8px;font-size: large;">${item.pcb}</span><span style="margin-left: 90px;">${item.spcb}</span></p>
                       <div style="line-height : 80px;">
           
                       <div style="display: flex;flex-direction: row;">
                          
                           <div><p style="transform: rotate(270deg);">${item.EAN13}</p></div>
                       <div style="margin-right: 50px;border: 4px solid black;">
                           <img src="https://barcode.tec-it.com/barcode.ashx?data=&multiplebarcodes=true&translate-esc=true" alt="Code-barres">
                       </div>
                       </div>
                   
                       </div>
           
                   </div>
                   <div id="l2col2" >
                       <div style="border-bottom:4px solid black;">
                       
                       <p style="margin-left: 5mm;">colis n° ${index + 1}<span style="margin-left: 40px;">sur</span><span style="margin-left: 6px;font-size: larger;">31</span></p>
                   </div>
                   <div style="border-bottom:4px solid black;"> 
                       <p style="margin-left: 5mm;">Numéro présentation<span style="margin-left: 12px;font-size: larger;">numero de pr </span></p>
                   </div>
                       <div style="line-height : 50px;border-bottom:4px solid;">
                       <p style="margin-left: 5mm;">Numéro de bon de commande:</p>
                       <p  style="margin-left: 5mm;">Code produit national<span style="margin-left: 12px;font-size: larger;">Code Produi</span></p>
                   </div>
                       <p  style="margin-left: 5mm;">Compostition du colis<span style="margin-left: 12px;font-size: larger;">TU</span></p>
                       <p  style="margin-left: 5mm;">Notion allotie<span style="margin-left: 12px;">AL</span></p>
                       
           
           
                       
                   
               </div>
           </div>
            </div>  
      
              `;
              break; 
      case "Modèle ADRESSE":
                itemClass = 'adresse';
                itemContent = `
                <div id="etiquetteadresse">
      
                <div id="partie-encadreeadresse">
                    <img id="vulli-logo" src="./images/Vulli_logo-modified.jpg" alt="Code-barres"
                        style="height : 120px;align-items: center;" />
                    <div id="informations" >
                        <p>VULLI S.A</p>
                        <p>Z.I.Des Granges</p>
                        <p>74150 RUMILLY FRANCE</p>
                        <p>Tél. +33(0)450010620</p>
                    </div>
            </div></div>
                
        
                <div style="line-height : 10px; margin-left: 42px;font-family: Arial, sans-serif;font-size: large;">
                    <p>Sophie Giraf</p>
                    <p>C/O Precious Toy ApS</p>
                    <p>Havremarken 4, Hal V</p>
                </div>
                    <div style= "line-height : 10px; margin-left: 42px;margin-top: 40px;font-family: Arial, sans-serif;font-size: large;">
                  <p>3650 <span style="margin-left: 20px;">0elstykke</span>  </p>
                    <p>DANEMARK</p>
                </div>
                <div style="margin-left: 478px;margin-top: -28px;"><b>1/1</b></div>
        
            </div>
                `;
                break; 
      case "Modèle GALLAFAY":
                  itemClass = 'galerielafayette';
                  itemContent = `
                  <div id="etiquettegalerielafayette">
                  <div style=" border: 3px solid black;margin-left: 100px;">
                  <div id="partieencadree">
                      <div id="Vulli_logo">
                          <img src=".images/Vulli_logo-modified.jpg" alt="Code-barres">
                          </div>
                      <div id="informationss" >
                          <p>VULLI S.A</p>
                          <p>Z.I.Des Granges</p>
                          <p style="min-width: 10px;">74150 RUMILLY FRANCE</p>
                          <p>Tél. +33(0)450010620</p>
          
                      </div>
                  </div>
          
                  </div>
                  <div style="line-height : 70px;font-weight: bolder;">
                  <p>GALERIES LAFAYETTE</p>
                  <p>REF : ${item.ref}</p>
          
              </div>
              <div style="text-align: right;"><b>3/3</b></div>
          
              </div>
                  `;
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