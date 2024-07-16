
/**
 * Enumeration that represents transaction propagation behaviors for use with the see {@link Transactional} decorator.
 */
export enum PropagationType {
  /**
   * Support a current transaction, throw an exception if none exists.
   */
  MANDATORY = 'MANDATORY',
  /**
   * Execute non-transactional, suspend the current transaction if one exists.
   */
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  /**
   * Support a current transaction, create a new one if none exists.
   */
  REQUIRED = 'REQUIRED',
  /**
   * Support a current transaction, execute non-transactional if none exists.
   */
  SUPPORTS = 'SUPPORTS',
}

