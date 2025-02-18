import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { VariableSizeList as VList } from 'react-window';
import { PageHeader } from 'ui/component';
import AddressItem from './AddressItem';
import IconPinned from 'ui/assets/icon-pinned.svg';
import IconPinnedFill from 'ui/assets/icon-pinned-fill.svg';

import './style.less';
import { obj2query } from '@/ui/utils/url';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { sortAccountsByBalance } from '@/ui/utils/account';
import clsx from 'clsx';
import { ReactComponent as IconAddAddress } from '@/ui/assets/address/add-address.svg';
import { groupBy } from 'lodash';
import styled from 'styled-components';
import { KEYRING_CLASS } from '@/constant';

const AddressManagement = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const enableSwitch = location.pathname === '/switch-address';

  // todo: store redesign
  const {
    accountsList,
    highlightedAddresses = [],
    loadingAccounts,
  } = useRabbySelector((s) => ({
    ...s.accountToDisplay,
    highlightedAddresses: s.addressManagement.highlightedAddresses,
  }));

  const [sortedAccountsList, watchSortedAccountsList] = React.useMemo(() => {
    const restAccounts = [...accountsList];
    let highlightedAccounts: typeof accountsList = [];
    let watchModeHighlightedAccounts: typeof accountsList = [];

    highlightedAddresses.forEach((highlighted) => {
      const idx = restAccounts.findIndex(
        (account) =>
          account.address === highlighted.address &&
          account.brandName === highlighted.brandName
      );
      if (idx > -1) {
        if (restAccounts[idx].type === KEYRING_CLASS.WATCH) {
          watchModeHighlightedAccounts.push(restAccounts[idx]);
        } else {
          highlightedAccounts.push(restAccounts[idx]);
        }
        restAccounts.splice(idx, 1);
      }
    });
    const data = groupBy(restAccounts, (e) =>
      e.type === KEYRING_CLASS.WATCH ? '1' : '0'
    );

    highlightedAccounts = sortAccountsByBalance(highlightedAccounts);
    watchModeHighlightedAccounts = sortAccountsByBalance(
      watchModeHighlightedAccounts
    );

    return [
      highlightedAccounts.concat(data['0'] || []).filter((e) => !!e),
      watchModeHighlightedAccounts.concat(data['1'] || []).filter((e) => !!e),
    ];
  }, [accountsList, highlightedAddresses]);

  const accountList = useMemo(
    () => [...(sortedAccountsList || []), ...(watchSortedAccountsList || [])],
    [sortedAccountsList, watchSortedAccountsList]
  );

  const noAccount = useMemo(() => {
    return accountList.length <= 0 && !loadingAccounts;
  }, [accountList, loadingAccounts]);

  const dispatch = useRabbyDispatch();

  useEffect(() => {
    dispatch.addressManagement.getHilightedAddressesAsync().then(() => {
      dispatch.accountToDisplay.getAllAccountsToDisplay();
    });
  }, []);

  const NoAddressUI = (
    <div className="no-address">
      <img
        className="no-data-image"
        src="/images/nodata-address.png"
        alt="no address"
      />
      <p className="text-gray-content text-14">{t('NoAddress')}</p>
    </div>
  );

  const currentAccount = useRabbySelector((s) => s.account.currentAccount);

  const currentAccountIndex = useMemo(() => {
    if (!currentAccount || !enableSwitch) {
      return -1;
    }
    return accountList.findIndex((e) =>
      (['address', 'brandName', 'type'] as const).every(
        (key) => e[key].toLowerCase() === currentAccount[key].toLowerCase()
      )
    );
  }, [accountList, currentAccount, enableSwitch]);

  const gotoAddAddress = () => {
    history.push('/add-address');
  };

  const switchAccount = async (account: typeof sortedAccountsList[number]) => {
    await dispatch.account.changeAccountAsync(account);
    history.push('/dashboard');
  };

  const Row = (props) => {
    const { data, index, style } = props;
    const account = data[index];
    const favorited = highlightedAddresses.some(
      (highlighted) =>
        account.address === highlighted.address &&
        account.brandName === highlighted.brandName
    );

    return (
      <div className="address-wrap-with-padding px-[20px]" style={style}>
        <AddressItem
          balance={account.balance}
          address={account.address}
          type={account.type}
          brandName={account.brandName}
          alias={account.alianName}
          extra={
            <div
              className={clsx(
                'icon-star  border-none px-0',
                favorited ? 'is-active' : 'opacity-0 group-hover:opacity-100'
              )}
              onClick={(e) => {
                e.stopPropagation();
                dispatch.addressManagement.toggleHighlightedAddressAsync({
                  address: account.address,
                  brandName: account.brandName,
                });
              }}
            >
              <img
                className="w-[13px] h-[13px]"
                src={favorited ? IconPinnedFill : IconPinned}
                alt=""
              />
            </div>
          }
          onClick={() => {
            history.push(
              `/settings/address-detail?${obj2query({
                address: account.address,
                type: account.type,
                brandName: account.brandName,
                byImport: account.byImport || '',
              })}`
            );
          }}
          onSwitchCurrentAccount={() => {
            switchAccount(account);
          }}
          enableSwitch={enableSwitch}
        />
      </div>
    );
  };

  return (
    <div className="page-address-management px-0 overflow-hidden">
      <PageHeader className="pt-[24px] mx-[20px]">
        {enableSwitch ? 'Current Address' : t('Address Management')}

        <IconAddAddress
          className="absolute right-0 top-[20px] text-gray-title w-[20px] h-[20px] cursor-pointer"
          onClick={gotoAddAddress}
        />
      </PageHeader>

      {currentAccountIndex !== -1 && accountList[currentAccountIndex] && (
        <>
          <div className="address-wrap-with-padding px-[20px]">
            <AddressItem
              balance={accountList[currentAccountIndex].balance || 0}
              address={accountList[currentAccountIndex].address || ''}
              type={accountList[currentAccountIndex].type || ''}
              brandName={accountList[currentAccountIndex].brandName || ''}
              alias={accountList[currentAccountIndex].alianName}
              isCurrentAccount
              onClick={() => {
                history.push(
                  `/settings/address-detail?${obj2query({
                    address: accountList[currentAccountIndex].address,
                    type: accountList[currentAccountIndex].type,
                    brandName: accountList[currentAccountIndex].brandName,
                    byImport:
                      ((accountList[currentAccountIndex]
                        .byImport as unknown) as string) || '',
                  })}`
                );
              }}
            />
          </div>
          <SwitchTips>Switch Address</SwitchTips>
        </>
      )}
      {noAccount ? (
        NoAddressUI
      ) : (
        <>
          <div className={'address-group-list management'}>
            <VList
              height={500}
              width="100%"
              itemData={accountList}
              itemCount={accountList.length}
              itemSize={(i) => (i !== sortedAccountsList.length - 1 ? 64 : 78)}
              className="scroll-container"
            >
              {Row}
            </VList>
          </div>
        </>
      )}
    </div>
  );
};

const SwitchTips = styled.div`
  width: 211px;
  height: 14px;
  position: relative;
  margin: 0 auto;
  margin-top: 20px;
  margin-bottom: 12px;
  font-weight: 400;
  font-size: 12px;
  line-height: 14px;
  text-align: center;
  color: #b4bdcc;
  &::before,
  &::after {
    content: '';
    width: 52px;
    height: 0px;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    border-bottom: 1px solid #e5e9ef;
  }
  &::before {
    left: 0;
  }
  &::after {
    right: 0;
  }
`;

export default AddressManagement;
