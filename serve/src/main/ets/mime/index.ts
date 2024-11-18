import otherTypes from './types/other';
import standardTypes from './types/standard';
import Mime from './Mime';

export { Mime };

export const mime = new Mime(standardTypes, otherTypes)._freeze();