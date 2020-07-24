import React from 'react';
import {  MainHeader, TitleBlock } from '~/styles/BaseStyle';
const Header: React.FC = () => {
    return(
        <MainHeader>
            <TitleBlock>
                <h2>친구</h2>
                <i className="fas fa-user-plus"/>
            </TitleBlock>
            <input placeholder="이름 검색"/>                        
        </MainHeader>
    )
}

export default Header;