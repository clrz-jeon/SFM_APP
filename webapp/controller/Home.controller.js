sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/Fragment",
  "sap/ui/core/Item"
], function (Controller, JSONModel, MessageToast, MessageBox, Fragment, Item) {
  "use strict";

  return Controller.extend("sfmpcf.mainapp.controller.Home", {
    /* ===================== LIFECYCLE ===================== */
    onInit: function () {
      const oAppModel = new JSONModel({
        rules: [],
        filters: [],
        adjLogic: [],
        editBuffer: { Logic: "", Value: "", UoM: "" }
      });
      this.getView()?.setModel(oAppModel);
    },

    /* ===================== PUBLIC HANDLERS ===================== */
    onCreateNewRule: function () {
      this._navToWizardPage();
      this._resetGeneralFields(true /* bEnableCombos */);

      // reset edit-icons if present
      this.byId("idGenNameEditBtn")?.setVisible(false);
      this.byId("idGenDescEditBtn")?.setVisible(false);
      this.byId("idGenValidFromEditBtn")?.setVisible(false);
      this.byId("idGenValidToEditBtn")?.setVisible(false);
      this.byId("editIconScope")?.setVisible(false);
      this.byId("editIconPlants")?.setVisible(false);

      const oWizard = this._byAnyId(["idGenWizard", "GeneralWizard"]);
      oWizard?.discardProgress(oWizard.getSteps()?.[0], true);
      this._iEditRuleIndex = undefined;
    },

    onSaveAndNext: function () {
      const oWizard = this._byAnyId(["idGenWizard", "GeneralWizard"]);
      const sCurrentStepId = oWizard?.getCurrentStep?.();
      if (!sCurrentStepId) { return; }

      const oStepGeneral = this._byAnyId(["idGenStepGeneral", "StepGeneral"]);
      const oStepScope   = this._byAnyId(["idGenStepScope", "StepScope"]);
      const oStepFilter  = this._byAnyId(["idGenStepFilters", "StepFilters"]);
      const oStepAdj     = this._byAnyId(["idGenStepAdjLogic", "StepAdjLogic"]);

      const oView = this.getView();
      const oModel = oView?.getModel();
      const aRules = oModel?.getProperty("/rules") || [];

      /* Step 1: General Information */
      if (sCurrentStepId === oStepGeneral?.getId()) {
        if (!this._isGeneralInfoValid()) {
          this._toast("GENINFO_MANDATORY_MSG");
          return;
        }

        const sName = this._input("idGenNameInput", "inpName")?.getValue() || "";
        const sDesc = this._input("idGenDescInput", "inpDesc")?.getValue() || "";
        const sFrom = this._byAnyId(["idGenValidFromDP", "dpFrom"])?.getValue() || "";
        const sTo   = this._byAnyId(["idGenValidToDP", "dpTo"])?.getValue() || "";

        // MultiComboBox selections (join by comma for summary table)
        const aItemTypeItems = this._mcb("idGenItemTypeMCB", "selItemType")
          ?.getSelectedItems()
          ?.map(function (oItem) { return oItem.getText(); }) || [];
        const aRuleTypeItems = this._mcb("idGenRuleTypeMCB", "selRuleType")
          ?.getSelectedItems()
          ?.map(function (oItem) { return oItem.getText(); }) || [];

        const oNewRule = {
          ID: String(aRules.length + 1).padStart(3, "0"),
          Name: sName,
          Description: sDesc,
          ValidFrom: sFrom,
          ValidTo: sTo,
          ItemType: aItemTypeItems.join(","),
          RuleType: aRuleTypeItems.join(",")
        };

        if (this._iEditRuleIndex !== undefined && this._iEditRuleIndex >= 0) {
          aRules[this._iEditRuleIndex] = oNewRule;
          this._iEditRuleIndex = undefined;
        } else {
          aRules.push(oNewRule);
        }

        oModel?.setProperty("/rules", aRules);
        oWizard?.validateStep(oStepGeneral);
        oWizard?.nextStep();
        return;
      }

      /* Step 2: Scope */
      if (sCurrentStepId === oStepScope?.getId()) {
        // example scope widgets kept backward compatible
        const aSelectedPlantKeys = this.byId("_IDGenMultiComboBox")?.getSelectedKeys() || [];
        const sPlants = aSelectedPlantKeys.join(",");

        if (aRules.length > 0) {
          const iTargetIndex = (this._iEditRuleIndex !== undefined)
            ? this._iEditRuleIndex
            : aRules.length - 1;
          aRules[iTargetIndex].Plants = sPlants;
          oModel?.setProperty("/rules", aRules);
        }
        oWizard?.validateStep(oStepScope);
        oWizard?.nextStep();
        return;
      }

      /* Step 3: Filters */
      if (sCurrentStepId === oStepFilter?.getId()) {
        oWizard?.validateStep(oStepFilter);
        this._toast("FILTERS_SAVED_MSG");
        oWizard?.nextStep();
        return;
      }

      /* Step 4: Adjustment Logic */
      if (sCurrentStepId === oStepAdj?.getId()) {
        const aAdj = oModel?.getProperty("/adjLogic") || [];
        if (!aAdj.length) {
          this._toast("ADJ_LOGIC_REQUIRED_MSG");
          return;
        }
        oWizard?.validateStep(oStepAdj);
        MessageBox.success(this._i18n("RULE_SAVED_SUCCESS"), {
          title: this._i18n("SUCCESS_TITLE"),
          onClose: function () {
            this.byId("_IDGenNavContainer")?.backToTop();
          }.bind(this)
        });
        this._iEditRuleIndex = undefined;
      }
    },

    onDeleteRule: function () {
      const oTable = this.byId("_IDGenTable");
      const oModel = this.getView()?.getModel();
      const aSelectedItems = oTable?.getSelectedItems() || [];
      if (!aSelectedItems.length) {
        this._toast("SELECT_RULE_TO_DELETE_MSG");
        return;
      }

      const aRules = oModel?.getProperty("/rules") || [];
      const aSelectedIds = aSelectedItems.map(function (oItem) {
        return oItem.getBindingContext()?.getProperty("ID");
      });

      const aUpdatedRules = aRules.filter(function (oRule) {
        return !aSelectedIds.includes(oRule.ID);
      });

      oModel?.setProperty("/rules", aUpdatedRules);
      oTable?.removeSelections(true);
      this._toast("RULES_DELETED_MSG");
    },

    onEditRule: function () {
      const oTable = this.byId("_IDGenTable");
      const aSelectedItems = oTable?.getSelectedItems() || [];
      if (aSelectedItems.length !== 1) {
        this._toast("SELECT_ONE_RULE_TO_EDIT_MSG");
        return;
      }

      const oContext = aSelectedItems[0].getBindingContext();
      const sPath = oContext?.getPath();
      const oRuleData = oContext?.getObject();

      if (!sPath || !oRuleData) {
        this._toast("UNABLE_RETRIEVE_RULE_MSG");
        return;
      }

      const iIndex = parseInt(sPath.split("/").pop() ?? "-1", 10);
      if (iIndex === -1) {
        this._toast("INVALID_RULE_INDEX_MSG");
        return;
      }
      this._iEditRuleIndex = iIndex;

      this._navToWizardPage();

      // Step 1 values
      this._input("idGenNameInput", "inpName")?.setValue(oRuleData.Name || "");
      this._input("idGenDescInput", "inpDesc")?.setValue(oRuleData.Description || "");
      this._byAnyId(["idGenValidFromDP", "dpFrom"])?.setValue(oRuleData.ValidFrom || "");
      this._byAnyId(["idGenValidToDP", "dpTo"])?.setValue(oRuleData.ValidTo || "");

      // lock MCBs when editing existing
      const aItemTypeTexts = (oRuleData.ItemType || "").split(",").filter(Boolean);
      const aRuleTypeTexts = (oRuleData.RuleType || "").split(",").filter(Boolean);

      // Try to select by text (static items for now)
      this._selectMcbByText(this._mcb("idGenItemTypeMCB", "selItemType"), aItemTypeTexts);
      this._selectMcbByText(this._mcb("idGenRuleTypeMCB", "selRuleType"), aRuleTypeTexts);

      this._mcb("idGenItemTypeMCB", "selItemType")?.setEnabled(false);
      this._mcb("idGenRuleTypeMCB", "selRuleType")?.setEnabled(false);

      // show edit icons if you use them
      this.byId("idGenNameEditBtn")?.setVisible(true);
      this.byId("idGenDescEditBtn")?.setVisible(true);
      this.byId("idGenValidFromEditBtn")?.setVisible(true);
      this.byId("idGenValidToEditBtn")?.setVisible(true);

      // Step 2 (scope) – keep your legacy controls
      const aPlants = (oRuleData.Plants || "").split(",").filter(Boolean);
      this.byId("_IDGenSelect")?.setSelectedKey("Scope 1");
      this.byId("_IDGenMultiComboBox")?.setSelectedKeys(aPlants);

      this.byId("editIconScope")?.setVisible(true);
      this.byId("editIconPlants")?.setVisible(true);

      const oWizard = this._byAnyId(["idGenWizard", "GeneralWizard"]);
      oWizard?.discardProgress(oWizard.getSteps()?.[0], true);
    },

    /* ===================== FILTER DIALOGS (unchanged flow, cleaned) ===================== */
    onAddFilter: async function () {
      const sItemKey = this._mcb("idGenItemTypeMCB", "selItemType")?.getSelectedKeys()?.[0] || "";
      const sRuleKey = this._mcb("idGenRuleTypeMCB", "selRuleType")?.getSelectedKeys()?.[0] || "";

      if (sItemKey === "PRO" && sRuleKey === "AV") {
        await this._ensureDialog("_pAddDialog", "sfmpcf.mainapp.view.FilterAddDialog");
        (await this._pAddDialog)?.open();
        return;
      }
      if (["PRO", "REC", "SUP", "ES"].includes(sItemKey) && sRuleKey === "IN") {
        await this._ensureDialog("_pAddDialog2", "sfmpcf.mainapp.view.FilterAdd2Dialog");
        (await this._pAddDialog2)?.open();
        return;
      }
      this._toast("ADD_FILTER_SELECT_VALID_MSG");
    },

    onCharacteristicChange2: function (oEvent) {
      const sKey = oEvent.getSource().getSelectedKey();
      const oOperator = this.getView()?.byId("selOperator2");
      const oUoM = this.getView()?.byId("selUoM2");

      oOperator?.removeAllItems();
      oUoM?.removeAllItems();

      oOperator?.addItem(new Item({ key: "", text: this._i18n("OPERATOR_SELECT") }));
      oUoM?.addItem(new Item({ key: "NA", text: this._i18n("UOM_NOT_APPLICABLE") }));

      switch (sKey) {
        case "FootprintValue":
          oOperator?.addItem(new Item({ key: "EQ", text: this._i18n("OP_EQ") }));
          oOperator?.addItem(new Item({ key: "NE", text: this._i18n("OP_NE") }));
          oOperator?.addItem(new Item({ key: "LT", text: this._i18n("OP_LT") }));
          oOperator?.addItem(new Item({ key: "GT", text: this._i18n("OP_GT") }));

          oUoM?.removeAllItems();
          oUoM?.addItem(new Item({ key: "KG", text: "KgCO2e" }));
          oUoM?.addItem(new Item({ key: "KGP", text: "KgCO2e per Kg" }));
          break;

        case "FootprintType":
        case "Product":
        case "ProductGroup":
          oOperator?.addItem(new Item({ key: "EQ", text: this._i18n("OP_EQ") }));
          break;

        default:
          break;
      }
    },

    onConfirmAddFilter: function () {
      const sCharText = this.byId("selCharacteristic")?.getSelectedItem()?.getText();
      const sOperKey = this.byId("selOperator")?.getSelectedKey();
      const sValText = this.byId("inpValue")?.getSelectedItem()?.getText();
      const sUoMKey = this.byId("selUoM")?.getSelectedKey();

      if (!sCharText || !sOperKey || !sValText) {
        this._toast("FILTERS_REQUIRED_MSG");
        return;
      }

      const oModel = this.getView()?.getModel();
      const aFilters = oModel?.getProperty("/filters") || [];

      const oEntry = {
        Characteristics: sCharText,
        Operator: this._mapOperatorText(sOperKey),
        Value: sValText,
        UoM: sUoMKey === "NA" ? this._i18n("UOM_NOT_APPLICABLE") : sUoMKey
      };

      if (this._iEditFilterIndex !== undefined && this._iEditFilterIndex >= 0) {
        aFilters[this._iEditFilterIndex] = oEntry;
        this._iEditFilterIndex = undefined;
      } else {
        aFilters.push(oEntry);
      }

      oModel?.setProperty("/filters", aFilters);
      this.byId("dlgAddFilter")?.close();
    },

    onCancelAddFilter: function () { this._closeDialogPromise("_pAddDialog"); },

    onFilterDialogClose: function () {
      this.byId("selCharacteristic")?.setSelectedKey("");
      this.byId("selOperator")?.setSelectedKey("");
      this.byId("inpValue")?.setSelectedKey("");
      this.byId("selUoM")?.setSelectedKey("");
      this._iEditFilterIndex = undefined;

      const oDialog = this.byId("dlgAddFilter");
      if (oDialog) {
        oDialog.getBeginButton()?.setText(this._i18n("BTN_ADD"));
        oDialog.setTitle(this._i18n("FILTER_DEFINE_TITLE"));
      }
    },

    onFilterDialogClose2: function () {
      this.byId("selCharacteristic2")?.setSelectedKey("");
      this.byId("selOperator2")?.setSelectedKey("");
      this.byId("inpValue2")?.setSelectedKey("");
      this.byId("selUoM2")?.setSelectedKey("");
      this._iEditFilterIndex = undefined;

      const oDialog = this.byId("dlgAddFilter2");
      if (oDialog) {
        oDialog.getBeginButton()?.setText(this._i18n("BTN_ADD"));
        oDialog.setTitle(this._i18n("FILTER_DEFINE_TITLE"));
      }
    },

    onConfirmAddFilter2: function () {
      const sCharText = this.byId("selCharacteristic2")?.getSelectedItem()?.getText();
      const sOperKey = this.byId("selOperator2")?.getSelectedKey();
      const sValText = this.byId("inpValue2")?.getSelectedItem()?.getText();
      const sUoMText = this.byId("selUoM2")?.getSelectedItem()?.getText();

      if (!sCharText || !sOperKey || !sValText) {
        this._toast("FILTERS_REQUIRED_MSG");
        return;
      }

      const oModel = this.getView()?.getModel();
      const aFilters = oModel?.getProperty("/filters") || [];

      const oEntry = {
        Characteristics: sCharText,
        Operator: this._mapOperatorText(sOperKey),
        Value: sValText,
        UoM: sUoMText === "NA" ? this._i18n("UOM_NOT_APPLICABLE") : sUoMText
      };

      if (this._iEditFilterIndex !== undefined && this._iEditFilterIndex >= 0) {
        aFilters[this._iEditFilterIndex] = oEntry;
        this._iEditFilterIndex = undefined;
      } else {
        aFilters.push(oEntry);
      }

      oModel?.setProperty("/filters", aFilters);
      this.byId("dlgAddFilter2")?.close();
    },

    onEditFilter: async function () {
      const oTable = this.byId("tblFilters");
      const aSelectedItems = oTable?.getSelectedItems() || [];
      if (aSelectedItems.length !== 1) {
        this._toast("SELECT_ONE_ROW_TO_EDIT_MSG");
        return;
      }

      const oModel = this.getView()?.getModel();
      const oContext = aSelectedItems[0].getBindingContext();
      const sPath = oContext?.getPath();
      if (!sPath) { this._toast("UNABLE_RETRIEVE_CONTEXT_MSG"); return; }

      this._iEditFilterIndex = parseInt(sPath.split("/").pop() ?? "-1", 10);
      const oRow = oModel?.getProperty(sPath);

      const sItemKey = this._mcb("idGenItemTypeMCB", "selItemType")?.getSelectedKeys()?.[0] || "";
      const sRuleKey = this._mcb("idGenRuleTypeMCB", "selRuleType")?.getSelectedKeys()?.[0] || "";

      if (sItemKey === "PRO" && sRuleKey === "AV") {
        this.byId("selCharacteristic")?.setSelectedKey(this._mapCharacteristicKey(oRow.Characteristics));
        this.byId("selOperator")?.setSelectedKey(this._mapOperatorKey(oRow.Operator));
        this.byId("inpValue")?.setSelectedKey(this._mapValueKey(oRow.Value));
        this.byId("selUoM")?.setSelectedKey(oRow.UoM === this._i18n("UOM_NOT_APPLICABLE") ? "NA" : oRow.UoM);

        await this._ensureDialog("_pAddDialog", "sfmpcf.mainapp.view.FilterAddDialog");
        const oDialog = await this._pAddDialog;
        oDialog.setTitle(this._i18n("FILTER_EDIT_TITLE"));
        oDialog.getBeginButton()?.setText(this._i18n("BTN_UPDATE"));
        oDialog.open();
      } else {
        this.byId("selCharacteristic2")?.setSelectedKey(this._mapCharacteristicKey(oRow.Characteristics));
        this.onCharacteristicChange2({ getSource: () => this.byId("selCharacteristic2") });

        setTimeout(function () {
          this.byId("selOperator2")?.setSelectedKey(this._mapOperatorKey(oRow.Operator));
          this.byId("inpValue2")?.setSelectedKey(this._mapValueKey(oRow.Value));
          this.byId("selUoM2")?.setSelectedKey(oRow.UoM === this._i18n("UOM_NOT_APPLICABLE") ? "NA" : oRow.UoM);
        }.bind(this), 0);

        await this._ensureDialog("_pAddDialog2", "sfmpcf.mainapp.view.FilterAdd2Dialog");
        const oDialog2 = await this._pAddDialog2;
        oDialog2.setTitle(this._i18n("FILTER_EDIT_TITLE"));
        oDialog2.getBeginButton()?.setText(this._i18n("BTN_UPDATE"));
        oDialog2.open();
      }
    },

    onCancelAddFilter2: function () { this._closeDialogPromise("_pAddDialog2"); },

    onDeleteFilter: function () {
      const oTable = this.byId("tblFilters");
      const aSelectedItems = oTable?.getSelectedItems() || [];
      if (!aSelectedItems.length) { this._toast("SELECT_FILTER_TO_DELETE_MSG"); return; }

      MessageBox.confirm(this._i18n("FILTER_DELETE_CONFIRM_MSG"), {
        title: this._i18n("CONFIRM_TITLE"),
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        emphasizedAction: MessageBox.Action.YES,
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.YES) { this._performFilterDeletion(aSelectedItems); }
        }.bind(this)
      });
    },

    onAddAdjLogic: async function () {
      const sItemKey = this._mcb("idGenItemTypeMCB", "selItemType")?.getSelectedKeys()?.[0] || "";
      const sRuleKey = this._mcb("idGenRuleTypeMCB", "selRuleType")?.getSelectedKeys()?.[0] || "";

      if (sItemKey === "PRO" && sRuleKey === "AV") {
        await this._ensureDialog("_pAdjLogicDialog", "sfmpcf.mainapp.view.AddAdjLogicDialog");
        const oDialog = await this._pAdjLogicDialog;
        oDialog.setTitle(this._i18n("ADJ_DEFINE_TITLE"));
        oDialog.getBeginButton()?.setText(this._i18n("BTN_ADD"));
        oDialog.open();
        return;
      }
      if (["PRO", "REC", "SUP", "ES"].includes(sItemKey) && sRuleKey === "IN") {
        await this._ensureDialog("_pAdjLogicDialog2", "sfmpcf.mainapp.view.AddAdjLogic2Dialog");
        const oDialog2 = await this._pAdjLogicDialog2;
        oDialog2.setTitle(this._i18n("ADJ_DEFINE_TITLE"));
        oDialog2.getBeginButton()?.setText(this._i18n("BTN_ADD"));
        oDialog2.open();
        return;
      }
      this._toast("INVALID_COMBINATION_MSG");
    },

    onConfirmAddAdjLogic: function () {
      const sLogic = this.byId("selLogic")?.getSelectedItem()?.getText();
      const sValue = this.byId("selLogicValue")?.getSelectedItem()?.getText();
      const sUoM = this.byId("selLogicUoM")?.getSelectedItem()?.getText();
      if (!sLogic || !sValue || !sUoM) { this._toast("FILL_ALL_FIELDS_MSG"); return; }

      const oModel = this.getView()?.getModel();
      const aLogic = oModel?.getProperty("/adjLogic") || [];

      const oEntry = { Logic: sLogic, Value: sValue, UoM: sUoM };
      if (this._iEditAdjIndex !== undefined && this._iEditAdjIndex >= 0) {
        aLogic[this._iEditAdjIndex] = oEntry;
        this._iEditAdjIndex = undefined;
      } else {
        aLogic.push(oEntry);
      }
      oModel?.setProperty("/adjLogic", aLogic);
      this.byId("dlgAddAdjLogic")?.close();
    },

    onCancelAddAdjLogic: function () {
      if (this._pAdjLogicDialog) {
        this._pAdjLogicDialog.then(function (oDlg) {
          this.byId("selLogic")?.setSelectedKey("");
          this.byId("selLogicValue")?.setSelectedKey("");
          this.byId("selLogicUoM")?.setSelectedKey("");
          this._iEditAdjIndex = undefined;
          oDlg.setTitle(this._i18n("ADJ_DEFINE_TITLE"));
          oDlg.getBeginButton()?.setText(this._i18n("BTN_ADD"));
          oDlg.close();
        }.bind(this));
      }
    },

    onConfirmAddAdjLogic2: function () {
      const sLogic = this.byId("selLogic2")?.getSelectedItem()?.getText();
      const sValue = this.byId("InpVal")?.getValue();
      const sUoM = this.byId("selLogicUoM2")?.getSelectedItem()?.getText();
      if (!sLogic || !sValue || !sUoM) { this._toast("FILL_ALL_FIELDS_MSG"); return; }

      const oModel = this.getView()?.getModel();
      const aLogic = oModel?.getProperty("/adjLogic") || [];

      const oEntry = { Logic: sLogic, Value: sValue, UoM: sUoM };
      if (this._iEditAdjIndex !== undefined && this._iEditAdjIndex >= 0) {
        aLogic[this._iEditAdjIndex] = oEntry;
        this._iEditAdjIndex = undefined;
      } else {
        aLogic.push(oEntry);
      }
      oModel?.setProperty("/adjLogic", aLogic);
      this.byId("dlgAddAdjLogic2")?.close();
    },

    onCancelAddAdjLogic2: function () {
      this._closeDialogPromise("_pAdjLogicDialog2");
    },

    onEditAdjLogic: async function () {
      const oTable = this.byId("tblAdjLogic");
      const aSelectedItems = oTable?.getSelectedItems() || [];
      if (aSelectedItems.length !== 1) { this._toast("SELECT_ONE_ROW_TO_EDIT_MSG"); return; }

      const oModel = this.getView()?.getModel();
      const oContext = aSelectedItems[0].getBindingContext();
      const sPath = oContext?.getPath();
      if (!sPath) { this._toast("UNABLE_RETRIEVE_CONTEXT_MSG"); return; }

      this._iEditAdjIndex = parseInt(sPath.split("/").pop() ?? "-1", 10);
      const oRow = oModel?.getProperty(sPath);

      const sItemKey = this._mcb("idGenItemTypeMCB", "selItemType")?.getSelectedKeys()?.[0] || "";
      const sRuleKey = this._mcb("idGenRuleTypeMCB", "selRuleType")?.getSelectedKeys()?.[0] || "";

      if (sItemKey === "PRO" && sRuleKey === "AV") {
        this.byId("selLogic")?.setSelectedKey(this._mapLogicKey(oRow.Logic));
        this.byId("selLogicValue")?.setSelectedKey(this._mapValueKey(oRow.Value));
        this.byId("selLogicUoM")?.setSelectedKey(oRow.UoM === this._i18n("UOM_NOT_APPLICABLE") ? "NA" : oRow.UoM);

        await this._ensureDialog("_pAdjLogicDialog", "sfmpcf.mainapp.view.AddAdjLogicDialog");
        const oDialog = await this._pAdjLogicDialog;
        oDialog.setTitle(this._i18n("ADJ_EDIT_TITLE"));
        oDialog.getBeginButton()?.setText(this._i18n("BTN_UPDATE"));
        oDialog.open();
      } else if (["PRO", "REC", "SUP", "ES"].includes(sItemKey) && sRuleKey === "IN") {
        this.byId("selLogic2")?.setSelectedKey(oRow.Logic);
        this.byId("InpVal")?.setValue(oRow.Value);
        this.byId("selLogicUoM2")?.setSelectedKey(oRow.UoM === this._i18n("UOM_NOT_APPLICABLE") ? "NA" : oRow.UoM);

        await this._ensureDialog("_pAdjLogicDialog2", "sfmpcf.mainapp.view.AddAdjLogic2Dialog");
        const oDialog2 = await this._pAdjLogicDialog2;
        oDialog2.setTitle(this._i18n("ADJ_EDIT_TITLE"));
        oDialog2.getBeginButton()?.setText(this._i18n("BTN_UPDATE"));
        oDialog2.open();
      } else {
        this._toast("INVALID_COMBINATION_MSG");
      }
    },

    onDeleteAdjLogic: function () {
      const oTable = this.byId("tblAdjLogic");
      const aSelectedItems = oTable?.getSelectedItems() || [];
      if (!aSelectedItems.length) { this._toast("SELECT_ADJ_TO_DELETE_MSG"); return; }

      MessageBox.confirm(this._i18n("ADJ_DELETE_CONFIRM_MSG"), {
        title: this._i18n("CONFIRM_TITLE"),
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        emphasizedAction: MessageBox.Action.YES,
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.YES) { this._performAdjLogicDeletion(aSelectedItems); }
        }.bind(this)
      });
    },

    /* ===================== PRIVATE HELPERS ===================== */
    _navToWizardPage: function () {
      const oNav = this.byId("_IDGenNavContainer");
      const oPage = this.byId("pageGenInfo");
      oNav?.to(oPage);
    },

    _resetGeneralFields: function (bEnableCombos) {
      this._input("idGenNameInput", "inpName")?.setValue("");
      this._input("idGenDescInput", "inpDesc")?.setValue("");
      this._byAnyId(["idGenValidFromDP", "dpFrom"])?.setValue("");
      this._byAnyId(["idGenValidToDP", "dpTo"])?.setValue("");

      const oItemTypeMCB = this._mcb("idGenItemTypeMCB", "selItemType");
      const oRuleTypeMCB = this._mcb("idGenRuleTypeMCB", "selRuleType");
      oItemTypeMCB?.removeAllSelectedItems();
      oRuleTypeMCB?.removeAllSelectedItems();
      if (typeof bEnableCombos === "boolean") {
        oItemTypeMCB?.setEnabled(bEnableCombos);
        oRuleTypeMCB?.setEnabled(bEnableCombos);
      }

      this.byId("_IDGenSelect")?.setSelectedKey("");
      this.byId("_IDGenMultiComboBox")?.removeAllSelectedItems();
    },

    _isGeneralInfoValid: function () {
      const bNameOk = !!this._input("idGenNameInput", "inpName")?.getValue()?.trim();
      const bDescOk = !!this._input("idGenDescInput", "inpDesc")?.getValue()?.trim();
      const bItemOk = !!this._mcb("idGenItemTypeMCB", "selItemType")?.getSelectedItems()?.length;
      const bRuleOk = !!this._mcb("idGenRuleTypeMCB", "selRuleType")?.getSelectedItems()?.length;
      return bNameOk && bDescOk && bItemOk && bRuleOk;
    },

    _performFilterDeletion: function (aSelectedItems) {
      const oModel = this.getView()?.getModel();
      const aExisting = oModel?.getProperty("/filters") || [];
      const aIndices = aSelectedItems
        .map(function (oItem) {
          const sPath = oItem.getBindingContext()?.getPath();
          return sPath ? parseInt(sPath.split("/").pop() ?? "-1", 10) : -1;
        })
        .filter(function (iIdx) { return iIdx !== -1; })
        .sort(function (iA, iB) { return iB - iA; });

      aIndices.forEach(function (iIndex) { aExisting.splice(iIndex, 1); });
      oModel?.setProperty("/filters", aExisting);
      this.byId("tblFilters")?.removeSelections();
      this._toast("FILTERS_DELETED_SUCCESS_MSG");
    },

    _performAdjLogicDeletion: function (aSelectedItems) {
      const oModel = this.getView()?.getModel();
      const aExisting = oModel?.getProperty("/adjLogic") || [];
      const aIndices = aSelectedItems
        .map(function (oItem) {
          const sPath = oItem.getBindingContext()?.getPath();
          return sPath ? parseInt(sPath.split("/").pop() ?? "-1", 10) : -1;
        })
        .filter(function (iIdx) { return iIdx !== -1; })
        .sort(function (iA, iB) { return iB - iA; });

      aIndices.forEach(function (iIndex) { aExisting.splice(iIndex, 1); });
      oModel?.setProperty("/adjLogic", aExisting);
      this.byId("tblAdjLogic")?.removeSelections();
      this._toast("ADJ_DELETED_SUCCESS_MSG");
    },

    _ensureDialog: async function (sPromiseFieldName, sFragmentName) {
      if (!this[sPromiseFieldName]) {
        this[sPromiseFieldName] = Fragment.load({
          id: this.getView()?.getId(),
          name: sFragmentName,
          controller: this
        });
        this.getView()?.addDependent(await this[sPromiseFieldName]);
      }
    },

    _closeDialogPromise: function (sPromiseFieldName) {
      if (this[sPromiseFieldName]) {
        this[sPromiseFieldName].then(function (oDlg) { oDlg.close(); });
      }
    },

    _mapCharacteristicKey: function (sText) {
      switch (sText) {
        case "Product": return "Product";
        case "Product group": return "ProductGroup";
        case "Footprint value": return "FootprintValue";
        case "Footprint type": return "FootprintType";
        default: return sText;
      }
    },
    _mapOperatorText: function (sKey) {
      switch (sKey) {
        case "EQ": return this._i18n("OP_EQ");
        case "NE": return this._i18n("OP_NE");
        case "LT": return this._i18n("OP_LT");
        case "GT": return this._i18n("OP_GT");
        default: return sKey;
      }
    },
    _mapOperatorKey: function (sText) {
      switch (sText) {
        case "Equal to": return "EQ";
        case "Not equal to": return "NE";
        case "Less than": return "LT";
        case "Greater than": return "GT";
        default: return sText;
      }
    },
    _mapLogicKey: function (sText) {
      switch (sText) {
        case "Rolling average": return "ROLLAVG";
        default: return sText;
      }
    },
    _mapValueKey: function (sText) {
      switch (sText) {
        case "Last 3 months": return "3";
        case "Last 6 months": return "6";
        case "Last 12 months": return "12";
        default: return sText;
      }
    },

    /* ===================== UTIL (ID + i18n) ===================== */
    _byAnyId: function (aIds) {
      for (const sId of aIds) {
        const oCtrl = this.byId(sId);
        if (oCtrl) { return oCtrl; }
      }
      return null;
    },
    _input: function (sNewId, sOldId) { return this.byId(sNewId) || this.byId(sOldId); },
    _mcb: function (sNewId, sOldId) { return this.byId(sNewId) || this.byId(sOldId); },

    _i18n: function (sKey) {
      return this.getView()?.getModel("i18n")?.getResourceBundle()?.getText(sKey) || sKey;
    },
    _toast: function (sKey) { MessageToast.show(this._i18n(sKey)); }
  });
});
