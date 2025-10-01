import React from 'react';
import { Link, Typography } from '@mui/material';

interface ExampleLinkProps {
    url: string;
    text: string;
    onClick: (url: string) => void;
}

const ExampleLink: React.FC<ExampleLinkProps> = ({ url, text, onClick }) => {
    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        onClick(url);
    };

    return (
        <Link href="#" onClick={handleClick} sx={{ color: '#a9b1c7', mx: 1 }} underline="hover">
            {text}
        </Link>
    );
};

export default ExampleLink;