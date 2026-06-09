import React, { forwardRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';

// This component fixes the Material-UI findDOMNode deprecation warning
// when using components like ListItem with component={Link}
// It creates a forwardRef wrapper for React Router's Link component
const LinkBehavior = forwardRef(({ href, ...props }, ref) => {
  // Map href (Material-UI) -> to (react-router)
  return <RouterLink ref={ref} to={href || props.to} {...props} />;
});

LinkBehavior.displayName = 'LinkBehavior';

export default LinkBehavior;
