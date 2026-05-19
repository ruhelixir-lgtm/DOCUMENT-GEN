'use strict';
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign, UnderlineType,
} = require('docx');
const ExcelJS = require('exceljs');

const TNR = "Times New Roman";
const FS  = 22;
const thinB  = { style: BorderStyle.SINGLE, size: 2, color: "888888" };
const thinBdrs = { top: thinB, bottom: thinB, left: thinB, right: thinB };

function R(text, o={}) {
  return new TextRun({ text: String(text||""), font: TNR, size: o.size||FS, bold: o.bold||false,
    underline: o.u ? { type: UnderlineType.SINGLE } : undefined, color: o.color||"000000" });
}
function B(t,o={})  { return R(t,{...o,bold:true}); }
function BU(t,o={}) { return R(t,{...o,bold:true,u:true}); }
function P(runs,o={}) {
  if (typeof runs==='string') runs=[R(runs)];
  if (!Array.isArray(runs)) runs=[runs];
  return new Paragraph({ alignment:o.align||AlignmentType.LEFT,
    spacing:{after:o.after!==undefined?o.after:160,before:o.before||0},
    indent:o.indent?{left:o.indent}:undefined, children:runs });
}
function SP(n=1) { return Array(n).fill(null).map(()=>new Paragraph({spacing:{after:80},children:[]})); }
function C(content,o={}) {
  let ch = Array.isArray(content)?content:[o.bold?B(String(content||"")):R(String(content||""))];
  return new TableCell({ borders:o.borders||thinBdrs,
    width:o.w?{size:o.w,type:WidthType.DXA}:undefined, columnSpan:o.colspan||1,
    shading:o.bg?{fill:o.bg,type:ShadingType.CLEAR}:undefined,
    margins:{top:60,bottom:60,left:100,right:100}, verticalAlign:VerticalAlign.CENTER,
    children:[new Paragraph({alignment:o.align||AlignmentType.LEFT,children:ch})] });
}
function TR(...cells) { return new TableRow({children:cells}); }
function T(rows,widths) {
  return new Table({ width:{size:widths.reduce((a,b)=>a+b,0),type:WidthType.DXA},
    columnWidths:widths, rows, margins:{top:0,bottom:160} });
}
function buildDoc(children) {
  return new Document({ styles:{default:{document:{run:{font:TNR,size:FS}}}},
    sections:[{ properties:{page:{size:{width:12240,height:15840},
      margin:{top:1080,right:1080,bottom:1080,left:1260}}}, children }] });
}


function toWords(n) {
  const map = {
    2000000:"RUPEES TWENTY LAKHS ONLY",229500:"RUPEES TWO LAKHS TWENTY NINE THOUSAND FIVE HUNDRED ONLY",
    1770500:"RUPEES SEVENTEEN LAKHS SEVENTY THOUSAND FIVE HUNDRED ONLY",
    4800000:"RUPEES FORTY EIGHT LAKHS ONLY",1019200:"RUPEES TEN LAKHS NINETEEN THOUSAND TWO HUNDRED ONLY",
    3780800:"RUPEES THIRTY SEVEN LAKHS EIGHTY THOUSAND EIGHT HUNDRED ONLY",
    1000000:"RUPEES TEN LAKHS ONLY",1500000:"RUPEES FIFTEEN LAKHS ONLY",
    2500000:"RUPEES TWENTY FIVE LAKHS ONLY",3000000:"RUPEES THIRTY LAKHS ONLY",
    500000:"RUPEES FIVE LAKHS ONLY",200000:"RUPEES TWO LAKHS ONLY",
    5000000:"RUPEES FIFTY LAKHS ONLY",10000000:"RUPEES ONE CRORE ONLY",
    750000:"RUPEES SEVEN LAKHS FIFTY THOUSAND ONLY",250000:"RUPEES TWO LAKHS FIFTY THOUSAND ONLY",
    100000:"RUPEES ONE LAKH ONLY",300000:"RUPEES THREE LAKHS ONLY",
    600000:"RUPEES SIX LAKHS ONLY",700000:"RUPEES SEVEN LAKHS ONLY",
    800000:"RUPEES EIGHT LAKHS ONLY",900000:"RUPEES NINE LAKHS ONLY",
  };
  return map[n] || `RUPEES ${Number(n).toLocaleString('en-IN')} ONLY`;
}
function fmtRs(n) { return `RS. ${Number(n).toLocaleString('en-IN')}/-`; }
function toBlock(lender) {
  return [
    P([R("To,")],{after:40}),
    P([B(lender.name+",")],{after:40}),
    ...(lender.address||[]).map(l=>P([R(l)],{after:40})),
  ];
}

function makeRequestLetter(D) {
  const dirSig = D.directors.map(d=>`(${d.name})`).join("     ");
  return buildDoc([
    P([B("DATE:- "),BU(D.loan.requestDate)],{after:200}),
    ...toBlock(D.lender),...SP(),
    P([B("Subject: Request for on demand bill of exchange discounting facility for Working Capital for our business requirements.")],{align:AlignmentType.CENTER,after:200}),
    P([R("Dear Sir,")]),...SP(),
    P([R("With respect to above mentioned subject, I/We request you to give On Demand bill of exchange discounting facility for "),BU(fmtRs(D.loan.boeAmount)+" ("+toWords(D.loan.boeAmount)+")"),R(" for which I/We will raise an on Demand Bill of Exchange in your favor. I/We are also ready to give On Demand bill of exchange discounting charges flat @ "),B(D.loan.ratePercent.toFixed(2)+"%"),R(" p.m. for a period of "),B(D.loan.tenureMonths+" Months"),R(". In order to simplify the repayment for us/me, you are requested to grant us the facility to repay the amount in installments. The cost of it if any will be borne by us.")]),...SP(),
    P([R("I/We hereby agree to submit to you all the relevant documents including Repayment cheques, on Demand Bill of exchange, confirmation & undertaking, PDC's, Board resolution (if applicable), personal details & other relevant documents immediately on availing the On Demand Bill of Exchange Discounting Facility.")]),...SP(),
    P([R("I/We have no objection in you obtaining information about our entity and its members from any Credit Rating Agencies and also authorize you to share details relating to this transaction with any Credit Rating Agencies.")]),...SP(),
    P([R("I/We assure you that we will not make any default in payments and in case it happens we hereby also agree to pay you the cheque Dishonor charges of Rs.5000/- per instance and additional 5% penal charges per month of the unpaid / dishonored cheque amount towards delayed payment for number of days till the payment is cleared.")]),...SP(),
    P([R("We hereby request you to consider our request and oblige.")]),...SP(),
    P([R("Thanking You,")],{after:40}),P([R("Yours Faithfully")]),...SP(2),
    P([R("For "),B(D.company.name+" ")],{after:160}),...SP(),
    P([B("  "+dirSig)],{after:80}),P([R("Photo with cross  sign")],{after:160}),
  ]);
}

function makeAuthorityLetter(D) {
  const dirSig   = D.directors.map(d=>`(${d.name})`).join("     ");
  const dirComma = D.directors.map(d=>d.name).join(", ");
  const dirAndOr = D.directors.map(d=>d.name).join(" and or ");
  return buildDoc([
    P([B("AUTHORITY LETTER ")],{after:40}),
    P([R("Date:  "),BU(D.loan.disbursementDate)],{after:200,align:AlignmentType.RIGHT}),
    ...toBlock(D.lender),...SP(),P([R("Dear Sir/Madam,")]),...SP(),
    P([R("I/We, the undersigned Directors of "),B(D.company.name),R(", hereby authorize "),B(dirComma),R(" Directors of the aforesaid company, to avail bill of exchange discounting facility of "),BU(fmtRs(D.loan.boeAmount)+" ("+toWords(D.loan.boeAmount)+")"),R(" from "),B(D.lender.name),R(" and also authorize, the Directors of the Company "),B(dirAndOr),R(" to execute all documents as required and to issue cheques towards repayment thereof.")]),...SP(),
    P([R("Yours Truly,")]),...SP(),
    P([R("For  "),B(D.company.name)],{after:160}),...SP(),
    P([B("  "+dirSig),R("      Photo with cross  sign")],{after:40}),
  ]);
}

function makeReceipt(D) {
  return buildDoc([
    P([B("RECEIPT")],{after:40}),
    P([R("                Date: "),BU(D.loan.disbursementDate)],{after:200,align:AlignmentType.RIGHT}),
    ...toBlock(D.lender),...SP(),P([R("Dear Sir/Mam,")]),...SP(),
    P([R("We confirm having received CHEQUE / RTGS UTR No "),B(D.loan.rtgsNo+" "),R("drawn on dated "),BU(D.loan.disbursementDate),R(" through "),B(D.loan.rtgsBank+","),R(" for "),BU(fmtRs(D.loan.boeAmount)+" ("+toWords(D.loan.boeAmount)+")"),R(" towards ON DEMAND BILL OF EXCHANGE Discounted of "),BU(fmtRs(D.loan.interestAmount)+"/- ("+toWords(D.loan.interestAmount)+")"),R(" after deducting On Demand bill of exchange discounting "),BU(fmtRs(D.loan.netDisbursed)+" ("+toWords(D.loan.netDisbursed)+")"),R(" as per our request.")]),...SP(2),
    T([TR(C("Revenue Stamp With Signature",{align:AlignmentType.CENTER,bold:true}))],[9360]),
  ]);
}


function makeBoardResolution(D) {
  const allDirs = D.directors.length>1
    ? D.directors.slice(0,-1).map(d=>d.name).join(", ")+" AND "+D.directors[D.directors.length-1].name
    : D.directors[0].name;
  const dirSig = D.directors.map(d=>`(${d.name})`).join("   ");
  return buildDoc([
    P([R("CERTIFIED TRUE COPY OF THE RESOLUTION PASSED AT THE MEETING OF THE BOARD OF DIRECTORS OF "),B(D.company.name),R(" HELD AT THE REGISTERED OFFICE OF THE COMPANY ON "),B(D.loan.boardResDate),R(" AT 11.00 A.M")],{after:120}),
    new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,size:6,color:"000000",space:2}},spacing:{after:200},children:[]}),
    P([R("\u201CRESOLVED THAT, the board has decided to avail on demand bill of exchange discounting facility or any other facility for temporary financial accommodation on behalf of the company from "),B(D.lender.name),R(".")],{after:200}),
    P([R("\u201CFURTHER RESOLVED THAT "),B(allDirs+", Directors"),R(" be and is/are hereby authorised to do all such acts, things as may be considered necessary to give effect to this resolution and also to;")],{after:160}),
    P([R("- To avail on demand bill of exchange discounting facility. ")],{indent:360,after:80}),
    P([R("- To pay on demand bill of exchange discounting charges")],{indent:360,after:80}),
    P([R("- To sign and execute all documents for availing such documents and such on demand bill of exchange discounting facility.")],{indent:360,after:80}),
    P([R("- To sign and issue cheques for repayments and any cheques in discharge of liability. ")],{indent:360,after:80}),
    P([R("- To Repay the advance sum received along with on demand bill of exchange discounting charges, overdue charges, penal charges.")],{indent:360,after:80}),
    P([R("- To issue letters like request letters, confirmations, receipts, any other letters as and when required for the said facility.")],{indent:360,after:80}),
    P([R("- To take all the necessary steps and actions in this behalf.")],{indent:360,after:200}),
    P([R("For  "),B(D.company.name)],{after:160}),...SP(),
    P([B("               "+dirSig)],{after:200}),...SP(),
    P([B("Company seal")],{after:40}),
  ]);
}

function makePersonalUndertaking(D, director) {
  return buildDoc([
    P([R("From,")],{after:40}),P([B(director.name)],{after:40}),
    ...(director.address||[]).map(l=>P([R(l)],{after:40})),...SP(),
    P([R("Date: "),BU(D.loan.disbursementDate)],{after:200}),
    ...toBlock(D.lender),...SP(),
    P([B("Sub: Confirmation "),B("& "),B("Undertaking")],{after:160}),
    P([R("\tDear Sir,\t")],{after:160}),
    P([R("This is to confirm that I/We "),B(director.name),R(" in my personal capacity hereby admit my signature on bill of exchange dated "),B(D.loan.disbursementDate),R(". I/We have signed as an acceptor in the On Demand Bill of Exchange under my personal capacity. ")]),...SP(),
    P([R("I/We hereby say that I/We am aware "),B("      "+D.company.name+"      "),R("has drawn the aforesaid bill of exchange in favour of "),B(D.lender.name),R(". I/We am aware that "),BU(fmtRs(D.loan.boeAmount)+" ("+toWords(D.loan.boeAmount)+")"),R(" is received by "),B("  "+D.company.name+"  "),R(" vide RTGS No/ Cheque No. "),B(D.loan.rtgsNo+" "),R("dated "),B(D.loan.disbursementDate),R(" after deducting bill of exchange discounting charges of "),BU(fmtRs(D.loan.interestAmount)+"/- ("+toWords(D.loan.interestAmount)+") "),R("The said amount is advanced for the period of "),B(D.loan.tenureMonths+" Months"),R(". And against which bill of exchange discounting charges are deducted upfront @ "+D.loan.ratePercent.toFixed(2)+"% p.m. ")]),...SP(),
    P([R("I hereby state that the drawee of the on demand bill of exchange can exercise his powers to demand the entire amount and on demand bill of exchange discounting charges along with penal/overdue charges, cheque bounce charges and visit charges")]),...SP(),
    P([R("I say that "),B(D.company.name),R(" is liable to repay the "),BU(fmtRs(D.loan.boeAmount)+" ("+toWords(D.loan.boeAmount)+") "),R("Within "),B(D.loan.tenureMonths+" Months"),R(" if he fails to pay so, then in such case I will personally repay the outstanding dues and overdue charges @ 5% p.m immediately, in case of any cheque bounce Rs. 5000/- towards cheque bounce charges.")]),...SP(),
    P([R("I state that I have signed and issued a cheque in your favor bearing no ________________________Bank,____________, Branch, in discharge of my liability. In case of default/delay in payment by "),B(D.company.name),R(" the said cheque can be utilized by you after filling in the amount to recover outstanding principle amount and outstanding overdue charges (if any).")]),...SP(),
    P([R("In case of any default "),B(D.lender.name+" "),R("in person or through its representative will have right to call for the entire outstanding dues, overdue charges (if any), visit charges, cheque bounce charges, or any other charges. Also, that "),B(D.lender.name+" "),R("will have authority to forfeit the entire on demand bill of exchange discounting charges.")]),...SP(),
    P([R("I/We say that incase "),B("  "+D.company.name+"  "),R(" drawer defaults in making the repayment within the stipulated period of time in any month I shall be personally liable to make any payments as I/We am the acceptor of bill of exchange and I/We have signed in my personal capacity. I/We say that I shall also be liable to pay Rs. 5000/- (Rupees Five Thousand only) if any cheque of the "),B("  "+D.company.name+"  "),R(" bounces. In case of any default I shall pay penalty @ 5% p.m on the outstanding amount along with outstanding advanced amount. ")]),...SP(),
    P([R("In case of any delay in making payment the drawee of the bill of exchange will hold rights to recover entire advanced amount along with overdue/ penal charges @ 5% p.m in the foregoing month. ")]),...SP(),
    P([R("In case of failure in making payment the drawee of the bill of exchange can take any legal action against me/us as may be prescribed in the law that the drawee of the on demand bill of exchange can also come personally or through its representative to my residence/native/office or any other address as and when required for any verification, collection of money or any other activity required for recovery of the sum advanced, on demand bill of exchange discounting charges/overdue charges/penalty/or any other charges as and when required during any time throughout the day or night, during weekdays, holidays or weekends without any further written or oral consent.")]),...SP(),
    P([R("In case of any default or dispute between the parties the matter may be referred to the arbitration to resolve the dispute under Arbitration and Conciliation Act, 2019, As (amended). All disputes will be subject to Mumbai jurisdiction only.")]),...SP(),
    P([R("The Drawee of bill of Exchange will have exclusive rights to appoint a sole arbitrator of his own choice and the Drawer or acceptor will not dispute the same. All the parties will deposit the fees of the arbitrator with the arbitrator and the party in whose favor the award is being passed will withdraw the deposited amount of fees and the other parties will have to bare the expenses and cost involved in the transaction. ")]),...SP(),
    P([R("Photo with cross  sign")],{after:80}),...SP(),
    P([R("Thanking You,"),R("Sincerely Yours")],{after:80}),...SP(),
    P([B("("+director.name+")")],{after:120}),
    T([
      TR(C("AADHAR NO",{bold:true,w:2160,borders:thinBdrs}),C(director.aadhaar,{w:4680,borders:thinBdrs})),
      TR(C("PAN NO.",  {bold:true,w:2160,borders:thinBdrs}),C(director.pan,    {w:4680,borders:thinBdrs})),
      TR(C("MOBILE NO.",{bold:true,w:2160,borders:thinBdrs}),C(director.mobile,{w:4680,borders:thinBdrs})),
    ],[2160,4680]),
  ]);
}


function makeCompanyUndertaking(D) {
  const dirSig   = D.directors.map(d=>`(${d.name})`).join(" ");
  const dirAndOr = D.directors.map(d=>d.name).join(" and/or ");
  const chqRows  = [];
  for (let i=0;i<10;i++) {
    const chq=D.cheques[i]||{};
    chqRows.push(TR(
      C(String(i+1),{w:600,align:AlignmentType.CENTER,borders:thinBdrs}),
      C(chq.no||"",{w:2160,borders:thinBdrs}),
      C(chq.date||"",{w:2400,borders:thinBdrs}),
      C(chq.amount?Number(chq.amount).toLocaleString('en-IN'):"",{w:2400,align:AlignmentType.RIGHT,borders:thinBdrs}),
    ));
  }
  return buildDoc([
    P([B(" Undertaking "),B("& "),B("Confirmation")],{after:40}),
    P([B("Date: - "),BU(D.loan.disbursementDate)],{after:200}),
    ...toBlock(D.lender),
    P([R("\t\t\t\t\tDear Sir / Madam,")],{after:160}),
    P([R("This is to confirm that, "),B("  "+D.company.name+"  "),R("have availed on Demand bill of exchange discounting facility of "),BU(fmtRs(D.loan.boeAmount)+" ("+toWords(D.loan.boeAmount)+") "),R("from you for business requirements.")]),...SP(),
    P([R("The sum of "),BU(fmtRs(D.loan.interestAmount)+"- ("+toWords(D.loan.interestAmount)+")"),R(" has been deducted towards bill of exchange discounting charges @ "),B(D.loan.ratePercent.toFixed(2)+"% pm"),R(" for the said period of "),B(D.loan.tenureMonths+" Months"),R(".")]),...SP(),
    T([
      TR(C("BILL OF EXCHANGE AMOUNT",{w:1680,bold:true,borders:thinBdrs}),C("DISCOUNTING CHARGES",{w:1440,bold:true,borders:thinBdrs}),C("NET AMOUNT RECEIVED",{w:1680,bold:true,borders:thinBdrs}),C("NO. OF Months",{w:1080,bold:true,borders:thinBdrs}),C("RATE DISCOUNT/ MONTH",{w:1440,bold:true,borders:thinBdrs}),C("CHEQUE NO. /RTGS/NEFT UTR NO.",{w:2040,bold:true,borders:thinBdrs})),
      TR(C([BU(D.loan.boeAmount.toString())],{w:1680,borders:thinBdrs}),C([B(D.loan.interestAmount.toString())],{w:1440,borders:thinBdrs}),C([B(D.loan.netDisbursed.toString())],{w:1680,borders:thinBdrs}),C([B(String(D.loan.tenureMonths).padStart(2,"0"))],{w:1080,borders:thinBdrs,align:AlignmentType.CENTER}),C([B(D.loan.ratePercent.toFixed(2)+"%")],{w:1440,borders:thinBdrs,align:AlignmentType.CENTER}),C([B(D.loan.rtgsNo)],{w:2040,borders:thinBdrs,align:AlignmentType.CENTER})),
    ],[1680,1440,1680,1080,1440,2040]),...SP(),
    P([R("I/we further confirm and state that I/we have issued cheques from A/c. No __________________________ Bank, ________________________________ Branch. voluntarily after having fully understood its legal implications as follows:")]),...SP(),
    T([
      TR(C("Sr. No.",{w:600,bold:true,borders:thinBdrs,align:AlignmentType.CENTER}),C("Cheque No.",{w:2160,bold:true,borders:thinBdrs}),C("Date",{w:2400,bold:true,borders:thinBdrs}),C("Amount",{w:2400,bold:true,borders:thinBdrs,align:AlignmentType.RIGHT})),
      ...chqRows,
    ],[600,2160,2400,2400]),...SP(),
    P([R("Towards re-payment of amount advanced to us in the form of bill of exchange document, I/ we hereby irrevocably confirm that the aforesaid amount is outstanding, and I/ we further solemnly assure you that:")]),...SP(),
    P([R("- I/We shall not close/transfer the mentioned bank account till all the above cheques are honored.")],{indent:360,after:80}),
    P([R("- I/We shall keep adequate balance in the bank to ensure honoring of the above cheques.")],{indent:360,after:80}),
    P([R("- I/We are personally, jointly and severally liable for the payment of the outstanding amount.")],{indent:360,after:80}),
    P([R("- I/We shall not seek deferment of the presentation of the cheques without your written approval.")],{indent:360,after:80}),
    P([R("- I/We shall never request you for not to present the above cheques in bank.")],{indent:360,after:80}),
    P([R("- I/We shall not do stop payment of the above cheques under any circumstances")],{indent:360,after:160}),
    P([R("I say that I have signed and issued a cheque in your favour from a bank account maintained in the name of "),B(D.company.name+"  "),R("______________________ Bank, ___________________ Branch, in discharge of liability. In case of default/delay in payment, the said cheque can be utilized by you after filling in the amount to recover outstanding principal amount and outstanding overdue charges (If any). This cheque is issued in discharge of my liability and I will never claim the same to be a security cheque. ")]),...SP(),
    P([R("\tI/We are aware that all the cheques issued in your favour by us are in due discharge of our legally enforceable liability for this transaction and in case of any default you are at liberty to proceed against me/ us and / or "),B(dirAndOr),R(" for recovery of amount, as you may be advised.")]),...SP(),
    P([R("In case we default in honouring our commitments you will hold full authority to demand the full outstanding amount/overdue/forfeit on demand bill of exchange discounting charges. In case of any default "),B(D.lender.name+"  "),R("in person or through its representative will have right to call for the entire outstanding dues, overdue charges (if any), visit charges, cheque bounce charges, or any other charges. Also that "),B(D.lender.name+" "),R("will have authority to forfeit the entire on demand bill of exchange discounting charges.")]),...SP(),
    P([R("We are also aware that in the event of any default in honoring the cheques, you are at liberty to take action against us under Section 138 of negotiable instrument act and / or any other legal action pertaining to the above matter including under section 420, 120(b), 406,407 of Indian Penal Code or any other such civil or criminal remedy available in the court of law. We shall be fully responsible for the expenditure of the same.")]),...SP(),
    P([R("All disputes will be subject to Mumbai jurisdiction only. ")]),...SP(),
    P([R("Thanking You,")],{after:40}),P([R("Yours Faithfully")]),...SP(),
    P([R("\tFor "),B(D.company.name+"  ")],{after:40}),
    P([R("Photo with cross  sign")],{after:80}),
    P([B(dirSig)],{after:40}),
  ]);
}

async function makeBillOfExchange(D, outDir) {
  const wb=new ExcelJS.Workbook();
  const ws=wb.addWorksheet("Sheet1");
  ws.columns=[{width:4},{width:6},{width:14},{width:16},{width:16},{width:6},{width:6},{width:6},{width:6},{width:14},{width:14},{width:6},{width:6}];
  const bf={name:'Times New Roman',size:11,bold:true};
  const nf={name:'Times New Roman',size:11};
  const ca={horizontal:'center',vertical:'middle',wrapText:true};
  const la={horizontal:'left',vertical:'middle',wrapText:true};
  function sc(r,c,v,o={}) {
    const cell=ws.getCell(r,c);cell.value=v;cell.font=o.bold?bf:nf;cell.alignment=o.center?ca:la;
    if(o.border)cell.border={top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}};
  }
  function mg(r1,c1,r2,c2){try{ws.mergeCells(r1,c1,r2,c2);}catch(e){}}
  sc(1,5,"BILL OF EXCHANGE",{bold:true,center:true});mg(1,5,1,9);
  sc(2,10,"DATE:",{bold:true});sc(2,11,D.loan.disbursementDate,{bold:true});
  sc(3,10,"PLACE:",{bold:true});sc(3,11,D.loan.place);
  sc(4,2,"Amount:",{bold:true});sc(4,3,"Rs.");sc(4,4,`${Number(D.loan.boeAmount).toLocaleString('en-IN')}/-`,{bold:true});
  const txt=`On Demand pay at Mumbai to ${D.lender.name} or order the sum of RS. ${Number(D.loan.boeAmount).toLocaleString('en-IN')}/-(${toWords(D.loan.boeAmount)}). For value received this day by transfer through RTGS/Cheque No.${D.loan.rtgsNo} , Dtd ${D.loan.disbursementDate} drawn on ${D.loan.rtgsBank}  (the liability of repayment is upon all the directors of the company / partners of firm/ Proprietor)`;
  sc(6,2,txt);mg(6,2,7,13);ws.getRow(6).height=50;
  sc(8,3,"To,");sc(9,4,"Acceptor's Name, Address and Sign.");mg(9,4,9,8);
  let br=11;
  for(const dir of D.directors){
    sc(br,1,"Notice Of Dishonour Waived",{bold:true});mg(br,1,br,4);
    sc(br,10,"Notice Of Dishonour Waived",{bold:true,center:true});mg(br,10,br,13);
    sc(br+1,2,"Revenue Stamp",{bold:true,border:true,center:true});mg(br+1,2,br+2,3);
    sc(br+1,10,"Revenue Stamp",{bold:true,border:true,center:true});mg(br+1,10,br+1,10);
    sc(br+1,11,"Revenue Stamp",{bold:true,border:true,center:true});mg(br+1,11,br+2,13);
    sc(br+1,1,"ACCEPTED BY",{bold:true});
    sc(br+2,4,dir.name,{bold:true});mg(br+2,4,br+2,9);
    sc(br+3,4,(dir.address||[]).join(", "));mg(br+3,4,br+4,9);
    sc(br+4,10,"Signature of Drawer",{bold:true,center:true});mg(br+4,10,br+4,13);
    sc(br+5,10,dir.name,{bold:true,center:true});mg(br+5,10,br+5,13);
    sc(br+5,3,"AADHAR No:");sc(br+5,4,dir.aadhaar,{bold:true});mg(br+5,4,br+5,6);
    sc(br+6,10,D.company.name,{bold:true,center:true});mg(br+6,10,br+6,13);
    ws.getRow(br).height=18;ws.getRow(br+1).height=18;ws.getRow(br+2).height=20;ws.getRow(br+3).height=30;
    br+=9;
  }
  sc(br+1,4,"Drawn by:");sc(br+2,4,D.company.name,{bold:true});mg(br+2,4,br+2,9);
  sc(br+3,4,"Drawer's Address:");sc(br+4,4,(D.company.address||[]).join(", "));mg(br+4,4,br+4,9);
  await wb.xlsx.writeFile(path.join(outDir,"4-Bill_of_Exchange.xlsx"));
}

async function makePromissoryNote(D, outDir) {
  const wb=new ExcelJS.Workbook();
  const ws=wb.addWorksheet("Sheet1");
  ws.columns=[{width:4},{width:6},{width:14},{width:16},{width:16},{width:6},{width:6},{width:6},{width:6},{width:14},{width:14},{width:6},{width:6}];
  const bf={name:'Times New Roman',size:11,bold:true};
  const nf={name:'Times New Roman',size:11};
  const ca={horizontal:'center',vertical:'middle',wrapText:true};
  function sc(r,c,v,o={}) {
    const cell=ws.getCell(r,c);cell.value=v;cell.font=o.bold?bf:nf;cell.alignment=o.center?ca:{horizontal:'left',vertical:'middle',wrapText:true};
    if(o.border)cell.border={top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}};
  }
  function mg(r1,c1,r2,c2){try{ws.mergeCells(r1,c1,r2,c2);}catch(e){}}
  sc(1,5,"PROMISSORY NOTE",{bold:true,center:true});mg(1,5,1,9);
  sc(2,10,"DATE:",{bold:true});sc(2,11,D.loan.disbursementDate,{bold:true});
  sc(3,10,"PLACE:",{bold:true});sc(3,11,D.loan.place);
  sc(4,2,"Amount:",{bold:true});sc(4,3,"Rs.");sc(4,4,`${Number(D.loan.boeAmount).toLocaleString('en-IN')}/-`,{bold:true});
  const mt=`I/We, ${D.directors[0].name} on behalf of  M/S. ${D.company.name} make commitment to pay to ${D.lender.name} [PAN :${D.lender.pan}] the sum of  RS. ${Number(D.loan.boeAmount).toLocaleString('en-IN')}/-(${toWords(D.loan.boeAmount)}). For value received this day.  In witness whereof, I/We set my hand under this seal and I/We acknowlede receipt of a completed copy of this instrument.  `;
  sc(6,2,mt);mg(6,2,8,13);ws.getRow(6).height=60;
  let br=10;
  for(let i=0;i<D.directors.length;i++){
    const dir=D.directors[i];
    sc(br,2,"   Signature");mg(br,2,br,4);
    if(i===1){sc(br,10,"Revenue Stamp",{bold:true,border:true,center:true});mg(br,10,br+1,11);sc(br,12,"Revenue Stamp",{bold:true,border:true,center:true});mg(br,12,br+1,13);}
    sc(br+1,4,dir.name,{bold:true});mg(br+1,4,br+1,9);
    sc(br+2,4,(dir.address||[]).join(", "));mg(br+2,4,br+3,9);
    sc(br+3,3,"PAN No:");sc(br+4,3,dir.pan,{bold:true});
    if(i===D.directors.length-1){
      const bb=`Signature & Stamp of Borrower FOR : ${D.company.name} ${(D.company.address||[]).join(" ")} (PAN : ${D.company.pan})`;
      sc(br+1,10,bb,{bold:true});mg(br+1,10,br+4,13);
    }
    ws.getRow(br).height=20;ws.getRow(br+1).height=18;ws.getRow(br+2).height=30;
    br+=6;
  }
  await wb.xlsx.writeFile(path.join(outDir,"10-Promissory_Note.xlsx"));
}

module.exports = {
  toWords, fmtRs,
  makeRequestLetter, makeAuthorityLetter, makeReceipt, makeBoardResolution,
  makePersonalUndertaking, makeCompanyUndertaking,
  makeBillOfExchange, makePromissoryNote
};
