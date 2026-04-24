!function ($) {

  // trigger visitor popup on button click
  $(document).click(function (e) {
    if ($(e.target).is('.MuiAccordionSummary-content') && $(e.target).parent().is('[data-locator="Icon_ExpandCardPayment"]')) {
      insideFrontInterface.triggerVisitorEvent('mastercard-popup');
    }
  });

  function themeWithNewTab() {
    const onlineThemes = [
      10, //Bunnings 2020 (HIDE CHAT TAB)
      33, //Bunnings 2021 (Price matching)
      34, //Bunnings 2021 (Customer Service)
      42, //Bunnings NZ 2023
      47, //Bunnings - Special Orders
      49, //Bunnings 2023 Trade Login
      51, //Bunnings NZ 2023 with VA
      53, //In Home Service 2023
      54, //Trade 2024
      56, //Trade 2024 (OFFLINE)
      15, //Bunnings 2024 (LIVE)
      58, //Trade NZ 2024
      59, // Bunnings 2024 (AI Transfer Task)
      60, // Bunnings 2024 - SMS Test
      61, // Bunnings 2024 (Order Status)
      64, // Bunnings NZ 2024 (Order Status)
      65, // Bunnings Retail VA Test 2026
    ];

    const offlineThemes = [
      46, //Bunnings 2023 (Offline SMS)
      47, //Bunnings - Special Orders
      49, //Bunnings 2023 Trade Login
      53, //In Home Service 2023
      54, //Trade 2024
      56, //Trade 2024 (OFFLINE)
      15, //Bunnings 2024 (LIVE)
      58, //Trade NZ 2024
      59, // Bunnings 2024 (AI Transfer Task)
      60, // Bunnings 2024 - SMS Test
      61, // Bunnings 2024 (Order Status)
      64, // Bunnings NZ 2024 (Order Status)
      65, // Bunnings Retail VA Test 2026
    ];

    const assitants = insideFrontInterface.getAvailableAssistants(), themeId = insideFrontInterface.chatSettings.chatSettingsId;
    return (assitants.length && onlineThemes.indexOf(themeId) > -1) || (assitants.length === 0 && offlineThemes.indexOf(themeId) > -1);
  }

  /**
   * Custom vertical chat tab
   */
  let chatTabSettingBackup;
  function checkChatSetting() {
    let chatSettings = insideFrontInterface.chatSettings;
    if(!chatTabSettingBackup) {
      chatTabSettingBackup = JSON.parse(JSON.stringify(chatSettings.chatTab));
    }
    _insideGraph.jQuery.inside.front.settings.chatSettings.chatTab = chatSettings.chatTab = JSON.parse(JSON.stringify(chatTabSettingBackup));

    const buttonTestingThemes = chatSettings.name.search('Chat Button Testing') > -1;
    const orderStatusThemes = false; // chatSettings.name.search('Order Status') > -1  && insideFrontInterface.getAvailableAssistants().length === 0; // order status only applicable to offline tab
    const bbqThemes = chatSettings.name.search('BBQ') > -1;
    const shedThemes = chatSettings.name.search('Shed') > -1;
    const airCondThemes = chatSettings.name.search('Air Cond') > -1;
    const clotheslineThemes = chatSettings.name.search('Clothesline') > -1;

    let tabImage, tabLabel = 'Chat';
    if(buttonTestingThemes || orderStatusThemes) {
      tabImage = '2-order-status-button-vertical.svg';
      tabLabel = 'Check your order status';
    } else if(bbqThemes) {
      tabImage = '2-bbq-button-vertical.svg';
      tabLabel = 'Need BBQ assembly?';
    } else if(shedThemes) {
      tabImage = '2-shed-button-vertical.svg';
      tabLabel = 'Need shed assembly?';
    } else if(airCondThemes) {
      tabImage = '2-aircond-button-vertical.svg';
      tabLabel = 'Need a fee measure and quote?';
    } else if(clotheslineThemes) {
      tabImage = '2-clothesline-button-vertical.svg';
      tabLabel = 'Need clothesline installation?';
    } else if(themeWithNewTab()) {
      tabImage = '2-livechat-button-vertical.svg';
      tabLabel = 'Chat with us';
    }
    
    if(tabImage) {
      let tabSettings = chatSettings.chatTab;
      let tabSettings2 = _insideGraph.jQuery.inside.front.settings.chatSettings.chatTab;
      tabSettings.onlineChatTab = tabImage;
      tabSettings2.onlineChatTab = tabImage;
      tabSettings.onlineChatTabMobile = tabImage;
      tabSettings2.onlineChatTabMobile = tabImage;
      tabSettings.activeChatTab = tabImage;
      tabSettings2.activeChatTab = tabImage;
      tabSettings.activeChatTabMobile = tabImage;
      tabSettings2.activeChatTabMobile = tabImage;
      tabSettings.offlineDesktopTab = tabImage;
      tabSettings2.offlineDesktopTab = tabImage;
      tabSettings.offlineMobileTab = tabImage;
      tabSettings2.offlineMobileTab = tabImage;
      tabSettings.showCloseOnTab = ['desktop', 'desktop_active', 'desktop_offline', 'mobile', 'mobile_active', 'mobile_offline'];
      tabSettings2.showCloseOnTab = ['desktop', 'desktop_active', 'desktop_offline', 'mobile', 'mobile_active', 'mobile_offline'];
      _insideGraph.jQuery.inside.front.settings.showCloseOnTab = tabSettings.showCloseOnTab;
      
      let tabBottomOffset = 20;
      const pdpFooter = $('#pdp-footer-container').outerHeight();
      if(pdpFooter) {
        tabBottomOffset += pdpFooter;
      }

      tabSettings.offset = { side: '0', vertical: tabBottomOffset.toString() };
      tabSettings2.offset = { side: '0', vertical: tabBottomOffset.toString() };
      tabSettings.mobileOffset = { side: '0', vertical: tabBottomOffset.toString() };
      tabSettings2.mobileOffset = { side: '0', vertical: tabBottomOffset.toString() };

      $('#inside_holder').addClass('vertical-chat-tab');
      $('body').addClass('inside-vertical-chat-tab');
    } else {
      $('#inside_holder').removeClass('vertical-chat-tab');
      $('body').removeClass('inside-vertical-chat-tab');
    }

    insideFrontInterface.chat.setChatTab();
    insideFrontInterface.chat.setTabOffsetPosition();
    $('#inside_liveChatTab').attr('aria-label', tabLabel);
  }
  insideFrontInterface.checkChatSetting = checkChatSetting;

  _insideGraph.defer(checkChatSetting, function() {
    return $('#inside_holder').length && insideFrontInterface.chatSettings;
  });
  _insideGraph.jQuery.inside.bind('connected', checkChatSetting);
  insideFrontInterface.bind("assistants", checkChatSetting);

  _insideGraph.defer(function () {
    let tabBottomOffset = 20;
    const pdpFooter = $('#pdp-footer-container').outerHeight();
    if(pdpFooter) {
      tabBottomOffset += pdpFooter;
    }
    const adjustFeedbackButton = function () {
      const visibleTab = $('.inside_chatTabImage:visible');
      if(visibleTab.length) {
        _insideGraph.defer(function () {
          document.body.style.setProperty('--feedbackBottomOffset', (visibleTab.outerHeight() + tabBottomOffset + 121) + 'px');
        }, function () {
          return visibleTab[0].complete;
        });
      }
    }
    const observer = new MutationObserver(adjustFeedbackButton);
    observer.observe(document.getElementById('inside_tabs'), { attributes: true });
    adjustFeedbackButton();
  }, function() {
    return document.getElementById('inside_tabs');
  });

  /**
   * Stock notification popup
   */
  function generateDynamicUrl() {
    let storeName, itemNumber, countryCode;
    storeName = $('a[data-locator="store-name"]').clone().children().remove().end().text();
    if(!storeName) {
      setTimeout(generateDynamicUrl, 100);
      return;
    }
    itemNumber = _insideData.product.sku;
    countryCode = _insideData.country;
    
    let iframe = $('#inside_holder iframe[src*="stock-notifications-register"]');
    let iframeUrl = iframe.attr('src') + '?localStoreName=' + storeName + '&itemNumber=' + itemNumber + '&countryCode=' + countryCode;
    iframe.attr('src', iframeUrl);
  }
  if($('#inside_holder iframe[src*="stock-notifications-register"]').length) {
    generateDynamicUrl();
  }

  $.inside.bind("insideAction", function (data) {
    if(data.type == "visitornotify" && data.settings && data.settings.iframe && data.settings.iframe.search('stock-notifications-register') > 0) {
      _insideGraph.defer(function() {
        $('#inside_holder').addClass('stockNotificationPopup');
        generateDynamicUrl();
      }, function() {
        return document.getElementById('inside_holder') && $('#inside_holder iframe[src*="stock-notifications-register"]').length;
      })
    }
  });
}(_insideGraph.jQuery)

/**
 * Functionality to open Text Me Back VA on different chat theme
 */
!function ($) {
  /**
   * Function to stop current VA / chat and restart Inside connection 
   */
  function restartConnection() {
    // stop current VA
    if (typeof insideChatPane !== 'undefined') {
      const insideWorkflows = insideChatPane.frame.contentWindow.insideWorkflows;
      if (insideWorkflows.currentWorkflow) {
        insideWorkflows.cancelWorkflowFromServer(insideWorkflows.currentWorkflow.workflowId);
      }
    }

    // stop current chat
    if (insideFrontInterface.currentChatId) {
      $.inside.server.stopChat(insideFrontInterface.currentChatId);
      insideChatPane.showStartANewChatButton();
    }

    // restart connection
    insideFrontInterface.disconnectSignalr();
    setTimeout(tryToReconnect, 1000);
  }

  function tryToReconnect() {
    insideFrontInterface.connectSignalr();
    if (_insideGraph.jQuery.inside.isDisconnected()) {
      setTimeout(tryToReconnect, 2000);
    }
  }

  function resetChatTheme(visitorEvent) {
    insideFrontInterface.triggerVisitorEvent(visitorEvent);
    restartConnection();
    // close existing chat pane
    if (typeof insideChatPane !== 'undefined' && insideChatPane.isOpen()) {
      insideChatPane.close();
      setTimeout(insideChatPane.showStartANewChatButton, 300);
      let prechatForm = insideChatPane.chatPane.querySelector('#inside_prechatForm');
      if (prechatForm) prechatForm.remove();
    }

    // open chat pane and trigger the prechat/offline VA
    _insideGraph.defer(function () {
      setTimeout(insideFrontInterface.openChatPane, 200);
    }, function () {
      return _insideGraph.jQuery.inside.isConnected();
    });
  }

  insideFrontInterface.aiTransfer = function () {
    resetChatTheme('assign-ai-transfer-flag');
  };

  insideFrontInterface.resetAiTransferFlag = function () {
    insideFrontInterface.triggerVisitorEvent('remove-ai-transfer-flag');
    restartConnection();
  };

  /**
   * reset the "Text Me Back" flag on chat ended event
   */
  _insideGraph.bind('chatended', function (data) {
    if(insideFrontInterface.chat.data.flags.includes('AI Transfer') || insideFrontInterface.chatSettings.name.includes('AI Transfer')) {
      insideFrontInterface.resetAiTransferFlag();
    }
  });

}(_insideGraph.jQuery)