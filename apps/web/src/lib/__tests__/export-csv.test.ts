import { exportToCSV } from '../export-csv';

describe('exportToCSV utility', () => {
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeAll(() => {
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = jest.fn();
  });

  afterAll(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('handles empty dataset gracefully without crashing', () => {
    expect(() => exportToCSV([], 'test-export')).not.toThrow();
  });

  it('generates downloadable blob link and triggers click for valid data', () => {
    const clickSpy = jest.fn();
    const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
      if (tagName === 'a') {
        el.click = clickSpy;
      }
      return el as any;
    });

    const mockData = [
      { commodity: 'Copper', quantity: 500, price: 9500 },
      { commodity: 'Aluminium', quantity: 1200, price: 2400 },
    ];

    exportToCSV(mockData, 'portfolio-export');

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    createElementSpy.mockRestore();
  });
});
