/**
 * Wrapping classes with functions prevents people from inheritance
 */
export function schema(...args) {
  return new Schema(...args);
}

export function string(name) {
  return new String(name);
}

export function integer(name) {
  return new Integer(name);
}

export function float(name) {
  return new Float(name);
}

export function boolean(name) {
  return new Boolean(name);
}

const notNull = () => (name, val) => {
  if (val == null)
  return new Error(`${name} must not be null`);
  return val;
}

class Field {
  name:string;
  constraints;
  notNull;
  constructor(name) {
    this.name = name;
    this.constraints = [];
    this.notNull = this.must(notNull);
  }

  // Apply custom field constraints
  must(fn: (...args) => any) {
    return (...args) => {
      this.constraints.push(fn(...args))
      return this;
    }
  }

  // Determine if a value fulfills field's constraints
  test(val?): boolean {
    // Run the input value through each of the constraints
    for (const constraint of this.constraints) {
      let temp = constraint(this.name, val);

      // Error objects indicate Test Failure
      if (temp instanceof Error) return false;

      // Don't re-assign val if constraint returned undefined
      if (temp !== undefined) val = temp;
    }

    // Run the first constraint (type check) once more
    const [typeConstraint] = this.constraints;
    if (typeConstraint(this.name, val) instanceof Error) return false;

    return true;
  }

  // Run a value through all field constraints
  validate(val?): [any, Error[]] {
    const errors = [];
    // Run the input value through each of the constraints
    this.constraints.forEach(constraint => {
      let temp = constraint(this.name, val);

      // Error objects indicate Test Failure
      if (temp instanceof Error) return errors.push(temp.message);

      // Don't re-assign val if constraint returned undefined
      if (temp !== undefined) val = temp;
    })

    // Run the first constraint (type check) once more
    const [typeConstraint] = this.constraints;
    const typeValidation = typeConstraint(this.name, val);
    if (typeValidation instanceof Error) errors.push(typeValidation.message);

    return [val, errors];
  }
}

const beStringFieldType = () => (name, val=null) => {
  if (val !== null && typeof val != 'string')
  return new Error(`${name} must be a string. Received ${typeof val}`);
  return val;
}

const minLength = arg => (name, val) => {
  if (!val || val.length < arg)
  return new Error(`${name} has a min length of ${arg}`)
  return val;
}

const maxLength = arg => (name, val) => {
  if (!val || val.length > arg)
  return new Error(`${name} has a max length of ${arg}`)
  return val;
}

const alphabetical = arg => (name, val) => {
  if (false == /^[a-zA-Z]+$/.test(val))
  return new Error(`${name} must only use alphabetical characters`);
  return val;
}

const numeric = () => (name, val) => {
  if (false == /^\d+$/.test(val))
  return new Error(`${name} must only use numeric characters`);
  return val;
}

const alphanumeric = arg => (name, val) => {
  if (false == /^[a-zA-Z0-9]+$/.test(val))
  return new Error(`${name} must only use alphanumeric characters`);
  return val;
}

const enumerated = (...args) => (name, val) => {
  if (!args.includes(val))
  return new Error(`Acceptable values for ${name} are: ${args.join(', ')}`);
  return val;
}

// https://www.regular-expressions.info/email.html
const email = () => (name, val) => {
  const pattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/
  if (false == pattern.test(val))
  return new Error(`${name} must be an email address`);
  return val;
}

class String extends Field {
  minLength;
  maxLength;
  alphabetical;
  numeric;
  alphanumeric;
  enumerated;
  constructor(name) {
    super(name);
    this.must(beStringFieldType)();
    this.minLength = this.must(minLength);
    this.maxLength = this.must(maxLength);
    this.alphabetical = this.must(alphabetical);
    this.numeric = this.must(numeric);
    this.alphanumeric = this.must(alphanumeric);
    this.enumerated = this.must(enumerated);
  }
}

const beIntegerFieldType = () => (name, val=null) => {
  if (val !== null && !Number.isInteger(val))
  return new Error(`${name} must be an integer. Received ${typeof val}`);
  return val;
}

const positive = () => (name, val) => {
  if (val < 0)
  return new Error(`${name} must not be negative`)
  return val;
}

const notZero = () => (name, val) => {
  if (val == 0)
  return new Error(`${name} must not be 0`)
  return val;
}

const range = (arg) => (name, val) => {
  const [min, max] = arg;
  if (val < min || val > max)
  return new Error(`${name} must be between ${min} and ${max}`)
}

class Integer extends Field {
  positive;
  notZero;
  range;
  constructor(name) {
    super(name);
    this.must(beIntegerFieldType)();
    this.positive = this.must(positive);
    this.notZero = this.must(notZero);
    this.range = this.must(range);
  }
}

const beFloatFieldType = () => (name, val=null) => {
  if (val !== null && typeof val !== 'number')
  return new Error(`${name} must be a float. Received ${typeof val}`);
  return val;
}

class Float extends Field {
  positive;
  notZero;
  range;
  constructor(name) {
    super(name);
    this.must(beFloatFieldType)();
    this.positive = this.must(positive);
    this.notZero = this.must(notZero);
    this.range = this.must(range);
  }
}

const beBooleanFieldType = () => (name, val=null) => {
  if (val !== null && typeof val != 'boolean')
  return new Error(`${name} must be a boolean. Received ${typeof val}`);
  return val;
}

class Boolean extends Field {
  constructor(name) {
    super(name);
    this.must(beBooleanFieldType)();
  }
}

export class Schema {
  fields = {};
  constructor(...fields) {
    for (const field of fields) {
      const { name, constraints, test, validate } = field;
      this.fields[name] = { name, constraints, test, validate };
    }
  }
  validate(obj:object={}): [object, Error[]] {
    const resultObj = {};
    const resultErrors = [];
    for (const key of Object.keys(this.fields)) {
      const [val, errors] = this.fields[key].validate(obj[key]);
      resultObj[key] = val;
      errors.forEach(e => resultErrors.push(e));
    }
    return [resultObj, resultErrors];
  }
}
